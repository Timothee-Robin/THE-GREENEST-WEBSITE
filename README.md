# BIGFOOT - Carbon Footprint Calculator

Link : the-greenest-website.vercel.app

BIGFOOT is a multi-step web app that helps users estimate their yearly carbon footprint across five categories:

- Transport
- Housing
- Food
- Consumption
- Waste and recycling

The app provides:

- A guided 5-step calculator flow
- A results page with breakdown and personalized advice
- Optional account-based history using Supabase
- An admin dashboard to monitor users and global stats

## Tech Stack

- HTML5 + CSS3
- Vanilla JavaScript (no framework)
- Supabase (Auth + PostgreSQL)
- External API: Rest Countries (for flight-distance estimation)

## Main Features

- Multi-step form with progress UI in `html/bilan.html`
- Category-level emissions calculation in `js/apicall.js`
- Result chart + recommendations in `js/result.js`
- Auth (sign up, login, logout) in `js/auth.js`
- Online history (save/list/delete assessments) in `js/bilans.js`
- Admin dashboard in `html/admin.html` + `js/admin.js`

## Project Structure

```
  css/
    style.css
    style-bilan.css
    style-result.css
    style-admin.css
  html/
    index.html
    bilan.html
    result.html
    about.html
    admin.html
  js/
    main.js
    apicall.js
    result.js
    supabaseClient.js
    auth.js
    bilans.js
    admin.js
  img/
  README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Timothee-Robin/THE-GREENEST-WEBSITE
```

### 2. Run the app locally

You can open `html/index.html` directly, but a local server is recommended.

Using Python:

```bash
python -m http.server 5500
```

Then open:

`http://localhost:5500/html/index.html`

Using VS Code, you can also use the Live Server extension.

## Admin Dashboard

The admin interface is available at `html/admin.html`.

Access requirements:

- Logged-in user
- `profiles.is_admin = true`

Capabilities:

- View total number of saved bilans
- View average total score (if RPC is available)
- List users
- Delete a user's profile data and related bilans

## Team

Project members (from the About page):

- Timothée Robin
- Youcef Cheriet
- Clayton Habyalimana
- Ibrahima Sory Diallo
- Jeremy Lebourgeois

## License

No license file is currently included.
If you want open-source reuse, add a license (for example MIT) in a `LICENSE` file.
