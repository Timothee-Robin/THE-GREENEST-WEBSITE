(function bilansModule() {
    function getClient() {
        return window.supabaseClient || null;
    }

    async function resolveCurrentUser() {
        const userFromState = window.bigfootAuth?.getCurrentUser?.();
        if (userFromState) return userFromState;

        const client = getClient();
        if (!client) return null;

        const { data, error } = await client.auth.getUser();
        if (error) {
            console.error("getUser fallback error:", error);
            return null;
        }

        return data?.user || null;
    }

    function getScoresFromLocalStorage() {
        const transport = parseFloat(localStorage.getItem("transportFootprint")) || 0;
        const housing = parseFloat(localStorage.getItem("housingFootprint")) || 0;
        const food = parseFloat(localStorage.getItem("foodFootprint")) || 0;
        const consumption = parseFloat(localStorage.getItem("consumptionFootprint")) || 0;
        const waste = parseFloat(localStorage.getItem("wasteFootprint")) || 0;

        const total = transport + housing + food + consumption + waste;

        return {
            transport_score: transport,
            housing_score: housing,
            food_score: food,
            consumption_score: consumption,
            waste_score: waste,
            total_score: total
        };
    }

    function setHistoryMessage(text, isError) {
        const messageEl = document.getElementById("history-message");
        if (!messageEl) return;
        messageEl.textContent = text || "";
        messageEl.style.color = isError ? "#c0392b" : "#174c2b";
    }

    function setHistoryLoading(isLoading) {
        const list = document.getElementById("history-list");
        if (!list) return;
        if (isLoading) {
            list.innerHTML = "<li>Loading...</li>";
        }
    }

    function formatDate(dateIso) {
        if (!dateIso) return "Unknown date";
        const date = new Date(dateIso);
        return date.toLocaleString("fr-FR");
    }

    function renderHistoryRows(rows) {
        const list = document.getElementById("history-list");
        if (!list) return;

        if (!rows || rows.length === 0) {
            list.innerHTML = "<li>No saved assessments yet.</li>";
            return;
        }

        list.innerHTML = rows
            .map(
                (row) => `
                <li class="history-item" data-id="${row.id}">
                    <div class="history-item-main">
                        <strong>${formatDate(row.created_at)}</strong>
                        <span>Total: ${Number(row.total_score || 0).toFixed(1)} kg CO2/year</span>
                    </div>
                    <div class="history-item-detail">
                        Transport ${Number(row.transport_score || 0).toFixed(1)} | Housing ${Number(row.housing_score || 0).toFixed(1)} | Food ${Number(row.food_score || 0).toFixed(1)} | Consumption ${Number(row.consumption_score || 0).toFixed(1)} | Waste ${Number(row.waste_score || 0).toFixed(1)}
                    </div>
                    <button type="button" class="btn-delete-bilan" data-id="${row.id}">Delete</button>
                </li>
            `
            )
            .join("");

        list.querySelectorAll(".btn-delete-bilan").forEach((button) => {
            button.addEventListener("click", async () => {
                const id = button.getAttribute("data-id");
                if (!id) return;

                try {
                    await deleteBilan(id);
                    setHistoryMessage("Assessment deleted.", false);
                    await fetchBilans();
                } catch (error) {
                    setHistoryMessage(error.message || "Delete failed.", true);
                }
            });
        });
    }

    async function saveCurrentBilanForConnectedUser() {
        const client = getClient();
        const user = await resolveCurrentUser();
        if (!client) return { saved: false, reason: "client_missing" };
        if (!user) return { saved: false, reason: "not_authenticated" };

        const scores = getScoresFromLocalStorage();

        const payload = {
            user_id: user.id,
            transport_score: scores.transport_score,
            housing_score: scores.housing_score,
            food_score: scores.food_score,
            consumption_score: scores.consumption_score,
            waste_score: scores.waste_score,
            total_score: scores.total_score
        };

        const { error } = await client.from("bilans").insert([payload]);
        if (error) throw error;

        return { saved: true, reason: "saved" };
    }

    async function fetchBilans() {
        const client = getClient();
        const user = await resolveCurrentUser();
        const list = document.getElementById("history-list");
        if (!list) return [];

        if (!client || !user) {
            list.innerHTML = "<li>Log in to view your online history.</li>";
            return [];
        }

        setHistoryLoading(true);
        const { data, error } = await client
            .from("bilans")
            .select("id, transport_score, housing_score, food_score, consumption_score, waste_score, total_score, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        renderHistoryRows(data || []);
        return data || [];
    }

    async function deleteBilan(id) {
        const client = getClient();
        const user = await resolveCurrentUser();
        if (!client || !user) throw new Error("Login required.");

        const { error } = await client
            .from("bilans")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
    }

    async function saveBilanAtFormEnd() {
        try {
            const result = await saveCurrentBilanForConnectedUser();
            if (result.saved) {
                localStorage.setItem("lastSavedMode", "supabase");
            } else {
                localStorage.setItem("lastSavedMode", "local");
            }
            return result;
        } catch (error) {
            console.error("Save bilan error:", error);
            localStorage.setItem("lastSavedMode", "local");
            return { saved: false, reason: "insert_failed", error };
        }
    }

    function setupHistoryAutoRefresh() {
        if (!window.bigfootAuth?.onUserChanged) return;
        window.bigfootAuth.onUserChanged(async () => {
            try {
                await fetchBilans();
            } catch (error) {
                setHistoryMessage(error.message || "Failed to load history.", true);
            }
        });
    }

    window.bigfootBilans = {
        getScoresFromLocalStorage,
        saveBilanAtFormEnd,
        fetchBilans,
        deleteBilan,
        setupHistoryAutoRefresh
    };

    document.addEventListener("DOMContentLoaded", () => {
        setupHistoryAutoRefresh();
    });
})();
