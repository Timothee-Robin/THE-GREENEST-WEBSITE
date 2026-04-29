(function authModule() {
    const authState = {
        user: null,
        listeners: []
    };

    function getClient() {
        return window.supabaseClient || null;
    }

    function setAuthNav(user) {
        const authNavLink = document.getElementById("auth-nav-link");
        if (!authNavLink) return;

        authNavLink.textContent = user ? "My Account" : "Login";
        authNavLink.setAttribute("aria-label", user ? "My Account" : "Login");
    }

    function setAuthPanelVisibility(user) {
        const authGuest = document.getElementById("auth-guest");
        const authUser = document.getElementById("auth-user");
        const userEmail = document.getElementById("auth-user-email");

        if (authGuest) authGuest.style.display = user ? "none" : "block";
        if (authUser) authUser.style.display = user ? "block" : "none";
        if (userEmail) userEmail.textContent = user?.email || "";
    }

    function notifyListeners(user) {
        authState.listeners.forEach((listener) => {
            try {
                listener(user);
            } catch (error) {
                console.error("Auth listener error:", error);
            }
        });
    }

    function setMessage(text, isError) {
        const messageEl = document.getElementById("auth-message");
        if (!messageEl) return;
        messageEl.textContent = text || "";
        messageEl.style.color = isError ? "#c0392b" : "#174c2b";
    }

    async function ensureProfileForUser(user) {
        const client = getClient();
        if (!client || !user?.id) return;

        const { error } = await client
            .from("profiles")
            .insert([{ id: user.id }], { onConflict: "id", ignoreDuplicates: true });

        if (error) {
            throw error;
        }
    }

    function isProfilesRlsInsertError(error) {
        if (!error) return false;
        const text = String(error.message || "").toLowerCase();
        return text.includes("row-level security policy") && text.includes("profiles");
    }

    async function signUp(email, password) {
        const client = getClient();
        if (!client) throw new Error("Supabase client is not initialized.");

        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    }

    async function signIn(email, password) {
        const client = getClient();
        if (!client) throw new Error("Supabase client is not initialized.");

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function signOut() {
        const client = getClient();
        if (!client) throw new Error("Supabase client is not initialized.");

        const { error } = await client.auth.signOut();
        if (error) throw error;
    }

    function onUserChanged(listener) {
        if (typeof listener !== "function") return () => {};
        authState.listeners.push(listener);
        listener(authState.user);

        return function unsubscribe() {
            authState.listeners = authState.listeners.filter((item) => item !== listener);
        };
    }

    async function initAuth() {
        const client = getClient();
        const config = window.bigfootSupabaseConfig;
        if (!client || !config?.isConfigured) {
            setAuthNav(null);
            setAuthPanelVisibility(null);
            if (document.getElementById("auth-message")) {
                setMessage("Local mode enabled: configure Supabase to enable authentication.", false);
            }
            return;
        }

        const { data, error } = await client.auth.getUser();
        if (error) {
            console.error("getUser error:", error);
        }
        authState.user = data?.user || null;
        setAuthNav(authState.user);
        setAuthPanelVisibility(authState.user);
        notifyListeners(authState.user);

        client.auth.onAuthStateChange((_event, session) => {
            authState.user = session?.user || null;
            setAuthNav(authState.user);
            setAuthPanelVisibility(authState.user);
            notifyListeners(authState.user);
        });
    }

    function bindAuthUI() {
        const signUpBtn = document.getElementById("btn-sign-up");
        const signInBtn = document.getElementById("btn-sign-in");
        const signOutBtn = document.getElementById("btn-sign-out");

        signUpBtn?.addEventListener("click", async () => {
            const email = document.getElementById("auth-email")?.value?.trim();
            const password = document.getElementById("auth-password")?.value;
            if (!email || !password) {
                setMessage("Email and password are required.", true);
                return;
            }

            try {
                const result = await signUp(email, password);

                if (!result?.user) {
                    setMessage("Sign-up created no user session. Please log in, then try again.", true);
                    return;
                }

                // Create profile immediately after account creation.
                try {
                    await ensureProfileForUser(result.user);
                    setMessage("Sign-up successful. Profile created.", false);
                } catch (profileError) {
                    if (isProfilesRlsInsertError(profileError)) {
                        // Common when DB trigger creates profile and table policy blocks direct client insert.
                        console.warn("Profile insert blocked by RLS; continuing:", profileError);
                        setMessage("Sign-up successful. Profile is managed by backend policy.", false);
                    } else {
                        throw profileError;
                    }
                }
            } catch (error) {
                setMessage(error.message || "Sign-up/profile creation error.", true);
            }
        });

        signInBtn?.addEventListener("click", async () => {
            const email = document.getElementById("auth-email")?.value?.trim();
            const password = document.getElementById("auth-password")?.value;
            if (!email || !password) {
                setMessage("Email and password are required.", true);
                return;
            }

            try {
                await signIn(email, password);
                setMessage("Login successful.", false);
            } catch (error) {
                setMessage(error.message || "Login error.", true);
            }
        });

        signOutBtn?.addEventListener("click", async () => {
            try {
                await signOut();
                setMessage("Logout successful.", false);
            } catch (error) {
                setMessage(error.message || "Logout error.", true);
            }
        });

        const authNavLink = document.getElementById("auth-nav-link");
        authNavLink?.addEventListener("click", (event) => {
            const panel = document.getElementById("auth-panel");
            if (!panel) return;
            event.preventDefault();
            panel.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    window.bigfootAuth = {
        getCurrentUser() {
            return authState.user;
        },
        onUserChanged,
        initAuth,
        bindAuthUI
    };

    document.addEventListener("DOMContentLoaded", async () => {
        bindAuthUI();
        await initAuth();
    });
})();
