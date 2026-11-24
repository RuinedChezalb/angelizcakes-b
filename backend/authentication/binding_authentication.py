import asyncio
import os
import secrets
from pathlib import Path, PurePosixPath

import requests
from authlib.integrations.base_client.errors import OAuthError
from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    redirect,
    request,
    send_from_directory,
    session,
    url_for,
)
from authlib.integrations.flask_client import OAuth
from prisma import Prisma
from database_service.query import api as database_api
from paymentAuth.payment_Auth import payment_webhook

load_dotenv(Path(__file__).parents[1] / '.env')
FRONTEND_FOLDER = Path(__file__).resolve().parents[2] / 'frontend'


app_environment = os.getenv('APP_ENV', '').strip().lower()
if app_environment not in {'development', 'production'}:
    raise RuntimeError('APP_ENV must be explicitly set to development or production')

email_provider = os.getenv('EMAIL_PROVIDER', 'smtp').strip().lower()
if email_provider not in {'smtp', 'resend'}:
    raise RuntimeError('EMAIL_PROVIDER must be either smtp or resend')

if app_environment == 'production' and 'AUTHLIB_INSECURE_TRANSPORT' in os.environ:
    raise RuntimeError('AUTHLIB_INSECURE_TRANSPORT must not be set in production')

required_environment = ('SESSION_KEY',) + (
    (
        'DOMAIN',
        'FRONTEND_ORIGINS',
        'META_APP_ID',
        'META_APP_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        *(('EMAIL_FROM', 'RESEND_API_KEY') if email_provider == 'resend' else (
            'EMAIL_SMTP_USERNAME',
            'EMAIL_SMTP_PASSWORD',
        )),
    )
    if app_environment == 'production'
    else ()
)
missing_environment = [
    name for name in required_environment if not os.getenv(name)
]
if missing_environment:
    raise RuntimeError(
        'Missing required environment variables: '
        + ', '.join(missing_environment)
    )

if app_environment == 'production':
    placeholder_markers = (
        'replace_with',
        'example.com',
        'your_',
        'changeme',
        'placeholder',
    )
    placeholder_environment = [
        name
        for name in (
            'DOMAIN',
            'SESSION_KEY',
            'META_APP_ID',
            'META_APP_SECRET',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            *(('EMAIL_FROM', 'RESEND_API_KEY') if email_provider == 'resend' else (
                'EMAIL_SMTP_USERNAME',
                'EMAIL_SMTP_PASSWORD',
            )),
        )
        if any(
            marker in os.environ[name].strip().lower()
            for marker in placeholder_markers
        )
    ]
    print("DOMAIN =", os.environ.get("DOMAIN"))
    print("PLACEHOLDERS =", placeholder_environment)
    if placeholder_environment:
        raise RuntimeError(
            'Replace placeholder production values for: '
            + ', '.join(placeholder_environment)
        )

    frontend_origin = f"https://{os.environ['DOMAIN'].strip().rstrip('/')}"
    configured_origins = {
        origin.strip().rstrip('/').lower()
        for origin in os.environ['FRONTEND_ORIGINS'].split(',')
        if origin.strip()
    }
    if frontend_origin.lower() not in configured_origins:
        raise RuntimeError(
            'FRONTEND_ORIGINS must include the public HTTPS DOMAIN origin'
        )

    payment_mode = os.getenv('PAYMONGO_MODE', 'live').strip().lower()
    if payment_mode not in {'test', 'live'}:
        raise RuntimeError('PAYMONGO_MODE must be either test or live')
    required_payment_environment = (
        f'PAYMONGO_{payment_mode.upper()}_PUBLIC_KEY',
        f'PAYMONGO_{payment_mode.upper()}_SECRET_KEY',
        f'PAYMONGO_{payment_mode.upper()}_WEBHOOK_SECRET',
    )
    missing_payment_environment = [
        name for name in required_payment_environment if not os.getenv(name)
    ]
    if missing_payment_environment:
        raise RuntimeError(
            'Missing required payment environment variables: '
            + ', '.join(missing_payment_environment)
        )
    expected_payment_prefixes = {
        f'PAYMONGO_{payment_mode.upper()}_PUBLIC_KEY': f'pk_{payment_mode}_',
        f'PAYMONGO_{payment_mode.upper()}_SECRET_KEY': f'sk_{payment_mode}_',
    }
    invalid_payment_environment = [
        name
        for name, prefix in expected_payment_prefixes.items()
        if not os.environ[name].strip().startswith(prefix)
        or any(
            marker in os.environ[name].strip().lower()
            for marker in placeholder_markers
        )
    ]
    if invalid_payment_environment:
        raise RuntimeError(
            'Invalid payment credentials for: '
            + ', '.join(invalid_payment_environment)
        )

app = Flask(__name__)
app.secret_key = os.getenv('SESSION_KEY')
if (
    app_environment == 'production'
    and len(app.secret_key.encode('utf-8')) < 32
):
    raise RuntimeError('SESSION_KEY must contain at least 32 bytes in production')

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=app_environment == 'production',
    PREFERRED_URL_SCHEME='https' if app_environment == 'production' else 'http',
    MAX_CONTENT_LENGTH=3 * 1024 * 1024,
)
if app_environment == 'production':
    trusted_hosts = {os.environ['DOMAIN'].strip().lower()}
    railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', '').strip().lower()
    if railway_domain:
        trusted_hosts.add(railway_domain)
    trusted_hosts.update(
        host.strip().lower()
        for host in os.getenv('ADDITIONAL_TRUSTED_HOSTS', '').split(',')
        if host.strip()
    )
    app.config['TRUSTED_HOSTS'] = sorted(trusted_hosts)
app.register_blueprint(payment_webhook)
app.register_blueprint(database_api)

default_frontend_origins = (
    ''
    if app_environment == 'production'
    else 'http://localhost:5500,http://127.0.0.1:5500'
)
frontend_origins = {
    origin.strip()
    for origin in os.getenv(
        'FRONTEND_ORIGINS',
        default_frontend_origins,
    ).split(',')
    if origin.strip()
}


@app.after_request
def add_api_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin in frontend_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = (
            'Content-Type, X-CSRF-Token'
        )
        response.headers['Access-Control-Allow-Methods'] = (
            'GET, POST, PATCH, DELETE, OPTIONS'
        )
        response.headers.add('Vary', 'Origin')
    return response

db = Prisma()

oauth = OAuth(app)
facebook = oauth.register(
    name='facebook',
    client_id=os.getenv('META_APP_ID'),
    client_secret=os.getenv('META_APP_SECRET'),
    access_token_url='https://graph.facebook.com/v22.0/oauth/access_token',
    authorize_url='https://www.facebook.com/v22.0/dialog/oauth',
    api_base_url='https://graph.facebook.com/v22.0/',
    client_kwargs={'scope': 'email public_profile'},
)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile https://www.googleapis.com/auth/user.phonenumbers.read',
    },
)


@app.errorhandler(OAuthError)
def handle_oauth_error(error):
    app.logger.warning('OAuth flow failed: %s', type(error).__name__)
    return jsonify({'error': 'OAuth authorization failed'}), 400


@app.route('/customer_controls/', defaults={'path': 'index.html'})
@app.route('/customer_controls/<path:path>')
def serve_customer_assets(path):
    return send_from_directory(FRONTEND_FOLDER / 'customer_controls', path)


@app.route('/admin_controls/', defaults={'path': 'index.html'})
@app.route('/admin_controls/<path:path>')
def serve_admin_assets(path):
    root = FRONTEND_FOLDER / 'admin_controls'
    target = (root / path).resolve()
    if target.is_dir():
        index_file = target / 'index.html'
        if index_file.is_file():
            relative_index = str(PurePosixPath(path, 'index.html'))
            return send_from_directory(root, relative_index)
    return send_from_directory(root, path)


@app.route('/')
def homepage():
    return redirect('frontend/store-front/index.html')


@app.route('/healthz')
def healthcheck():
    return jsonify({'status': 'ok'})


def oauth_redirect_uri(endpoint: str) -> str:
    if app_environment == 'production':
        return url_for(endpoint, _external=True, _scheme='https')
    return url_for(endpoint, _external=True)


@app.route('/login/facebook')
def login():
    try:
        redirect_uri = oauth_redirect_uri('facebook_authorize_callback')
        return facebook.authorize_redirect(redirect_uri)
    except requests.RequestException:
        app.logger.exception('Could not start Facebook authorization')
        return jsonify({'error': 'Could not start Facebook authorization'}), 502

@app.route('/login/facebook/callback')
def facebook_authorize_callback():
    try:
        facebook.authorize_access_token()
        response = facebook.get('me', params={'fields': 'id,name,email,picture'})
        response.raise_for_status()
        user_info = response.json()
    except requests.RequestException:
        app.logger.exception('Facebook profile request failed')
        return jsonify({'error': 'Could not retrieve the Facebook profile'}), 502
    except ValueError:
        app.logger.exception('Facebook returned an invalid profile response')
        return jsonify({'error': 'Facebook returned an invalid profile response'}), 502

    if not isinstance(user_info, dict):
        return jsonify({'error': 'Facebook returned an invalid profile response'}), 502
    fb_id = user_info.get('id')
    if not fb_id:
        return jsonify({'error': 'Facebook profile is missing its account ID'}), 502
    user_name = user_info.get('name')
    user_email = user_info.get('email')
    picture = user_info.get('picture')
    picture_data = picture.get('data') if isinstance(picture, dict) else None
    profile_pic = picture_data.get('url') if isinstance(picture_data, dict) else None

    async def save_facebook_account():
        await db.connect()
        try:
            return await db.facebookaccount.upsert(
                where={'facebookId': fb_id},
                data={
                    'create': {
                        'facebookId': fb_id,
                        'name': user_name,
                        'email': user_email,
                        'profileImage': profile_pic,
                    },
                    'update': {
                        'name': user_name,
                        'email': user_email,
                        'profileImage': profile_pic,
                    },
                },
            )
        finally:
            if db.is_connected():
                await db.disconnect()

    saved_user = asyncio.run(save_facebook_account())

    return jsonify({
        'status': 'Facebook account synchronized to database',
        'user_profile': {
            'database_id': saved_user.id,
            'display_name': saved_user.name,
            'registered_email': saved_user.email,
            'stored_avatar': saved_user.profileImage,
        },
    })

@app.route('/login/google')
def google_login():
    try:
        redirect_uri = oauth_redirect_uri('google_authorize_callback')
        return google.authorize_redirect(redirect_uri)
    except requests.RequestException:
        app.logger.exception('Could not start Google authorization')
        return jsonify({'error': 'Could not start Google authorization'}), 502

@app.route('/login/google/callback')
def google_authorize_callback():
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
    except requests.RequestException:
        app.logger.exception('Google profile request failed')
        return jsonify({'error': 'Could not retrieve the Google profile'}), 502
    except ValueError:
        app.logger.exception('Google returned an invalid profile response')
        return jsonify({'error': 'Google returned an invalid profile response'}), 502

    if not isinstance(user_info, dict):
        return jsonify({'error': 'Google returned an invalid profile response'}), 502

    phone_number = None
    try:
        phone_response = google.get(
            'https://people.googleapis.com/v1/people/me',
            params={'personFields': 'phoneNumbers'},
        )
        phone_response.raise_for_status()
        phone_data = phone_response.json()
        if not isinstance(phone_data, dict):
            app.logger.warning('Google People API returned an invalid profile response')
        else:
            phone_numbers = phone_data.get('phoneNumbers', [])
            if isinstance(phone_numbers, list):
                first_phone = next(
                    (
                        item.get('value')
                        for item in phone_numbers
                        if isinstance(item, dict)
                        and isinstance(item.get('value'), str)
                        and item.get('value').strip()
                    ),
                    None,
                )
                phone_number = first_phone.strip() if first_phone else None
            else:
                app.logger.warning('Google People API returned invalid phone-number data')
    except requests.HTTPError as error:
        if error.response is not None and error.response.status_code == 403:
            app.logger.warning(
                'Google denied phone-number access (403); enable the People API '
                'and grant the user.phonenumbers.read scope'
            )
        else:
            app.logger.exception('Google People API phone-number lookup failed')
    except requests.RequestException:
        app.logger.exception('Google People API phone-number lookup failed')

    google_id = user_info.get('sub')
    if not google_id:
        return jsonify({'error': 'Google profile is missing its account ID'}), 502
    user_name = user_info.get('name')
    user_email = user_info.get('email')
    profile_pic = user_info.get('picture')
    if not isinstance(user_email, str) or not user_email.strip():
        return jsonify({'error': 'Google profile is missing its email address'}), 502
    if user_info.get('email_verified') is not True:
        return jsonify({'error': 'Google must verify the account email address'}), 403
    normalized_email = user_email.strip().lower()

    async def save_google_customer():
        await db.connect()
        try:
            async with db.tx() as transaction:
                google_account = await transaction.googleaccount.find_unique(
                    where={'googleId': google_id},
                )
                if google_account and google_account.customerId is not None:
                    customer = await transaction.customer.find_unique(
                        where={'id': google_account.customerId},
                    )
                    if customer is None:
                        raise RuntimeError('The linked Google customer no longer exists')
                else:
                    customer = await transaction.customer.find_unique(
                        where={'email': normalized_email},
                    )
                    if customer is None:
                        customer_name = (
                            user_name.strip()
                            if isinstance(user_name, str) and user_name.strip()
                            else normalized_email
                        )
                        customer = await transaction.customer.create(data={
                            'email': normalized_email,
                            'name': customer_name,
                            'emailVerified': True,
                            'passwordHash': None,
                            'phone': phone_number,
                        })
                    else:
                        existing_google_account = await transaction.googleaccount.find_unique(
                            where={'customerId': customer.id},
                        )
                        if (
                            existing_google_account is not None
                            and existing_google_account.googleId != google_id
                        ):
                            raise ValueError(
                                'This customer account is already linked to another Google account'
                            )
                        customer = await transaction.customer.update(
                            where={'id': customer.id},
                            data={'emailVerified': True},
                        )

                if not customer.isActive or customer.isBlocked:
                    raise PermissionError('This customer account is unavailable')
                if phone_number is not None and not customer.phone:
                    customer = await transaction.customer.update(
                        where={'id': customer.id},
                        data={'phone': phone_number},
                    )

                create_google_account = {
                    'googleId': google_id,
                    'customerId': customer.id,
                    'name': user_name,
                    'email': user_email,
                    'profileImage': profile_pic,
                    'phoneNumber': phone_number,
                }
                update_google_account = {
                    'customerId': customer.id,
                    'name': user_name,
                    'email': user_email,
                    'profileImage': profile_pic,
                }
                if phone_number is not None:
                    update_google_account['phoneNumber'] = phone_number
                await transaction.googleaccount.upsert(
                    where={'googleId': google_id},
                    data={
                        'create': create_google_account,
                        'update': update_google_account,
                    },
                )
                return customer
        finally:
            if db.is_connected():
                await db.disconnect()

    try:
        customer = asyncio.run(save_google_customer())
    except PermissionError:
        return jsonify({'error': 'This customer account is unavailable'}), 403
    except ValueError as error:
        return jsonify({'error': str(error)}), 409
    except Exception:
        app.logger.exception('Could not create or link the Google customer account')
        return jsonify({'error': 'Could not complete Google sign-in'}), 503

    session.clear()
    session['identity'] = {
        'id': customer.id,
        'role': 'customer',
        'email': customer.email,
        'name': customer.name,
    }
    session['csrf_token'] = secrets.token_urlsafe(32)
    return redirect(url_for('homepage'))

if __name__ == '__main__':
    if app_environment == 'production':
        raise RuntimeError(
            'Run the production app with a WSGI server, not Flask app.run()'
        )
    app.run(port=5000, debug=True, use_reloader=False)