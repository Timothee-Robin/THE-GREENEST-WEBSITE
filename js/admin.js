(function adminDashboardModule() {
    function getClient() {
        return window.supabaseClient || null;
    }

    function redirectHome() {
        window.location.href = "index.html";
    }

    function setStatus(message, isError) {
        const el = document.getElementById("admin-status");
        if (!el) return;
        el.textContent = message || "";
        el.style.color = isError ? "#c0392b" : "#2f5d3c";
    }

    function formatDate(iso) {
        if (!iso) return "-";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("en-GB");
    }

    async function requireAdmin() {
        const client = getClient();
        if (!client) {
            throw new Error("Supabase client is not initialized.");
        }

        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError || !authData?.user) {
            redirectHome();
            return null;
        }

        const { data: profile, error: profileError } = await client
            .from("profiles")
            .select("id, is_admin")
            .eq("id", authData.user.id)
            .maybeSingle();

        if (profileError || !profile?.is_admin) {
            redirectHome();
            return null;
        }

        return authData.user;
    }

    async function fetchUsers() {
        const client = getClient();
        
        // Green IT optimization: We use a strict projection (selecting only the specific 
        // fields we need: id, email, created_at) instead of fetching everything with select('*').
        // This significantly reduces network bandwidth usage and memory footprint.
        const { data, error } = await client
            .from("profiles")
            .select("id, email, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    }

    function renderUsers(users) {
        const tbody = document.getElementById("users-tbody");
        if (!tbody) return;

        if (!users.length) {
            tbody.innerHTML = "<tr><td colspan=\"3\">No users found.</td></tr>";
            return;
        }

        tbody.innerHTML = users
            .map(
                (user) => `
                <tr>
                    <td>${user.email || "-"}</td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <button type="button" class="btn-delete-user" data-user-id="${user.id}">Delete account</button>
                    </td>
                </tr>
            `
            )
            .join("");

        tbody.querySelectorAll(".btn-delete-user").forEach((button) => {
            button.addEventListener("click", async () => {
                const targetUserId = button.getAttribute("data-user-id");
                if (!targetUserId) return;

                const confirmed = window.confirm("Delete this account data and all related bilans?");
                if (!confirmed) return;

                button.disabled = true;
                try {
                    await deleteUserAccountData(targetUserId);
                    setStatus("User account data deleted.", false);
                    await refreshUsers();
                    await refreshStats();
                } catch (error) {
                    console.error("Delete user error:", error);
                    setStatus(error.message || "Failed to delete user.", true);
                    button.disabled = false;
                }
            });
        });
    }

    // Admin operation: Deletes a user and their associated assessment history (bilans).
    // Security: This function is only accessible after the user's admin role has been verified 
    // by the requireAdmin() check. It uses parameterized queries via the Supabase client, 
    // which prevents SQL injection attacks.
    async function deleteUserAccountData(userId) {
        const client = getClient();

        // Security & Data Integrity: Delete dependent records (bilans) first to avoid orphan data 
        // and to safely enforce foreign key constraints before deleting the profile.
        const { error: bilansError } = await client
            .from("bilans")
            .delete()
            .eq("user_id", userId);

        if (bilansError) throw bilansError;

        // Finally, safely delete the user's profile.
        const { error: profileError } = await client
            .from("profiles")
            .delete()
            .eq("id", userId);

        if (profileError) throw profileError;
    }

    async function fetchBilanSummary() {
        const client = getClient();

        const { count, error: countError } = await client
            .from("bilans")
            .select("id", { count: "exact", head: true });

        if (countError) throw countError;

        const { data: summaryData, error: summaryError } = await client.rpc("admin_bilan_summary");

        if (summaryError) {
            return {
                totalBilans: count || 0,
                avgTotalScore: 0,
                avgAvailable: false,
                warning: "Average unavailable: create RPC function admin_bilan_summary in Supabase."
            };
        }

        const row = Array.isArray(summaryData) ? summaryData[0] : summaryData;
        const avgValue = row ? Number(row.avg_total_score) : null;

        return {
            totalBilans: count || 0,
            avgTotalScore: Number.isFinite(avgValue) ? avgValue : 0,
            avgAvailable: true,
            warning: ""
        };
    }

    function renderStats(summary) {
        const totalEl = document.getElementById("stat-total-bilans");
        const avgEl = document.getElementById("stat-avg-total");
        if (totalEl) totalEl.textContent = String(summary.totalBilans);
        if (avgEl) {
            avgEl.textContent = summary.avgAvailable ? `${summary.avgTotalScore.toFixed(2)} kg CO2` : "N/A";
        }
    }

    async function refreshUsers() {
        const users = await fetchUsers();
        renderUsers(users);
    }

    async function refreshStats() {
        const summary = await fetchBilanSummary();
        renderStats(summary);
        if (summary.warning) {
            setStatus(summary.warning, false);
        }
    }

    function bindLogout() {
        const button = document.getElementById("btn-logout");
        if (!button) return;

        button.addEventListener("click", async () => {
            const client = getClient();
            if (!client) return;

            button.disabled = true;
            try {
                const { error } = await client.auth.signOut();
                if (error) throw error;
                redirectHome();
            } catch (error) {
                console.error("Logout error:", error);
                setStatus(error.message || "Logout failed.", true);
                button.disabled = false;
            }
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        bindLogout();

        try {
            const user = await requireAdmin();
            if (!user) return;

            setStatus("Admin access granted.", false);
            await refreshStats();
            await refreshUsers();
            setStatus("Dashboard loaded.", false);
        } catch (error) {
            console.error("Admin dashboard error:", error);
            setStatus(error.message || "Dashboard error.", true);
        }
    });
})();
