(function initSupabaseClient() {
    const SUPABASE_URL = window.SUPABASE_URL || "https://kdavaprfpeheqbwzktfx.supabase.co";
    const SUPABASE_KEY = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYXZhcHJmcGVoZXFid3prdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzEzNDcsImV4cCI6MjA5MDgwNzM0N30.omgJWaeiooCnaruoA0PMJIDEg3Kiz1DL1-ygsEyjD1o";

    const isConfigured =
        SUPABASE_URL !== "SUPABASE_URL" &&
        SUPABASE_KEY !== "SUPABASE_KEY";

    window.bigfootSupabaseConfig = {
        SUPABASE_URL,
        SUPABASE_KEY,
        isConfigured
    };

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.warn("Supabase CDN not loaded.");
        return;
    }

    if (!isConfigured) {
        console.warn("Supabase not configured yet. Set SUPABASE_URL and SUPABASE_KEY in js/supabaseClient.js.");
        return;
    }

    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
