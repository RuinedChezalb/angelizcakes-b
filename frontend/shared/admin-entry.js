"use strict";

(async function requireAdminRole() {
  document.documentElement.style.visibility = "hidden";
  const targetRole = document.body.dataset.requiredRole;
  const api = window.angelizApi;

  function signIn() {
    const url = new URL("/store-front/", window.location.origin);
    url.hash = "login";
    window.location.replace(url.href);
  }

  try {
    if (!api || !["admin", "super_admin"].includes(targetRole)) {
      throw new Error("Administrator sign-in is unavailable.");
    }
    const { user } = await api.currentUser();
    if (!user) return signIn();
    if (user.role !== targetRole) {
      const destination = user.role === "admin" ? "/branch-admin/"
        : user.role === "super_admin" ? "/owner-admin/" : "/store-front/";
      window.location.replace(destination);
      return;
    }
    if (user.mustChangePassword) return signIn();
    const [profile, context] = await Promise.all([
      api.request("/admin/profile"),
      api.request("/admin/branch-context")
    ]);
    if (!profile?.profile || !Array.isArray(context?.branches) || !context.branches.length) {
      throw new Error("This administrator account has no available branch context.");
    }
    window.AdminSession = { user, profile: profile.profile, context };
    document.dispatchEvent(new CustomEvent("angeliz:admin-session-ready", { detail: window.AdminSession }));
    document.getElementById("branchAdminLogoutButton")?.addEventListener("click", async () => {
      try {
        await api.logout();
      } finally {
        window.location.replace("/store-front/#login");
      }
    });
    document.documentElement.style.visibility = "";
  } catch (error) {
    console.error("Administrator session check failed.", error);
    signIn();
  }
})();
