# AI to Startup — BSAD 281 term project

You're going to take a startup idea from a sentence to a **live website with its own link**, using an AI assistant (GitHub Copilot) to write the code. You don't need to know how to code. You do need to know what you want, describe it clearly, and check that it works.

Everything here happens in your **web browser**. You never need to type commands into a terminal.

> **Everything in this project is public.** Use first names only (or none), and never put real personal information, passwords or keys in any file.

---

## Before the lab (do this now — it takes a few days)

1. **Create a GitHub account** at [github.com](https://github.com). Your username doesn't need to be your real name.
2. **Apply for GitHub Education** at [education.github.com](https://education.github.com) → *Join GitHub Education* → *Student*. Use your **@stfx.ca** email and have a photo of your student ID ready. Approval can take a few days. It gives you more free Copilot use and more free workspace hours.
3. Bring your GitHub username and password to the lab.

If you're not approved by lab day, you can still do everything — you'll just have a smaller monthly allowance of Copilot chat messages, so use them wisely.

---

## Step 1 — Make your team's copy (one person per team)

Only **one** teammate does this step. That person "owns" the project.

1. Open the template link your instructor posted on Moodle.
2. Click the green **Use this template** button → **Create a new repository**.
3. **Owner:** you. **Repository name:** something short like `quickbite-prototype` (no spaces).
4. Choose **Public**, then click **Create repository**.
5. Add your teammates: **Settings** (top of the repo page) → **Collaborators** → **Add people** → type each teammate's GitHub username. They must accept the email invitation.

> A *repository* (or "repo") is just your project's folder, stored on GitHub, with a full history of every saved version.

## Step 2 — Open your workspace

1. On your repository page, click the green **Code** button → **Codespaces** tab → **Create codespace on main**.
2. Wait a minute or two. A coding workspace (VS Code) opens in your browser, already connected to Copilot.

Next time, go back to **Code → Codespaces** and click the workspace you already made. Don't make a new one each time.

> Your workspace stops by itself after 30 minutes of doing nothing. Your work is saved, but **only committed work** (Step 5) is safe and visible to your team.

## Step 3 — See your site

1. In the file list on the left, **right-click `index.html`** → **Show Preview**.
2. Your site appears in a panel beside the code. It updates as files change.

If you don't see *Show Preview*, wait for the workspace to finish loading, then try again.

## Step 4 — Build with Copilot

1. Open the **Chat** panel (the speech-bubble/Copilot icon, top or left side).
2. If there's a mode dropdown under the chat box, choose **Agent** — this lets Copilot edit your files directly.
3. Type what you want in plain English and press Enter.
4. Copilot shows the changes it made with **Keep** and **Undo** buttons. Check the preview. Keep what works; undo what doesn't.

This project already contains instructions telling Copilot the rules (plain HTML/CSS/JavaScript, fake data only, nothing to install). You don't need to repeat them.

### Good first prompts

Copy one, fill in the blanks, and send it:

> Our startup idea is: **[one sentence]**. Our customers are **[who]**, and the problem we solve is **[problem]**. Update `data.js` and the text in `index.html` so the site describes our startup. Don't change the layout yet.

> Replace the sample listings in `data.js` with 8 realistic but fake examples that fit our startup.

> Add a page that shows how our product gets more valuable as more people use it. Use fake numbers so we can compare 10 users with 10,000 users.

### How to talk to Copilot

- **One change at a time.** "Make the buttons green" works. "Make the site amazing with login, payments and AI" won't.
- **Describe what you see, not what you think the code is.** "When I click Save, nothing happens" is perfect.
- **When something breaks**, say what you did, what you expected, and what happened instead. Then ask it to fix *only that*.
- **If Copilot goes in circles**, click Undo, save a checkpoint of the last working version, and ask in a different way.
- **Write down your important prompts** in `project-notes/PROJECT_LOG.md` as you go. You'll need them.

### What Copilot can't do here (on purpose)

Real logins, real databases, real payments, real AI features, emails and texts all need servers, security and paid services. If you ask for them, Copilot will offer to **fake** them instead (for example, a checkout page that shows a pretend confirmation). That's the right answer for a prototype. Add the real version to the *"What a real version would need"* list in your project log — it's part of your grade.

## Step 5 — Save a checkpoint (commit) every time something works

A **commit** is a saved version of your project. It's your undo button for big mistakes, and it's how your work gets to GitHub and to your live site.

1. Click the **Source Control** icon on the left (it looks like three dots joined by lines, often with a number on it).
2. Type a short message describing what changed, like `Added pricing page`.
3. Click **Commit**. (If it asks *"stage all changes?"* click **Yes** / **Always**.)

That's it — this workspace is set up to upload ("sync") your commit to GitHub automatically.

> **Rule of thumb:** if it works and you'd be upset to lose it, commit it.

## Step 6 — Go live with GitHub Pages (do this once)

1. On your repository page on GitHub (not in the workspace), go to **Settings** → **Pages** (left menu).
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
4. Wait 1–5 minutes and refresh. A link appears at the top: `https://your-username.github.io/your-repo-name/`.

That link is your live site. Every commit updates it automatically within a few minutes. Submit this link on Moodle.

---

## Working as a team

- **One driver at a time.** Only one person makes changes with Copilot at a time. Say so in your group chat ("I'm driving until 8pm").
- **Before you start, sync.** In Source Control, click **Sync Changes** (or the circular arrows at the bottom of the window) so you have your teammates' latest work.
- **When you're done, commit**, then tell the group.
- Everyone should drive at least once. Your instructor can see who made each commit.

## When something goes wrong

| What you see | What to do |
|---|---|
| The page is blank or half-broken | Click **Undo** on Copilot's last change. If it's already kept, tell Copilot: "The page is blank since the last change. Find and fix the problem." |
| Copilot says you've reached your limit | Your monthly free messages are used up. Ask a teammate to drive, and check your GitHub Education status. |
| My live site doesn't show my latest change | Did you commit? Wait 5 minutes, then hard-refresh (Ctrl+Shift+R, or Cmd+Shift+R on a Mac). |
| Live site shows "404" | Check Step 6 settings, and make sure `index.html` is still in the main folder (not inside another folder). |
| Copilot wants to install something or run a command | Click **Undo** / **Skip** and say: "No installs. Plain HTML, CSS and JavaScript only." |
| "Sync" fails or mentions a conflict | Two people changed the same thing. Stop, don't click anything else, and contact your instructor. |
| I broke everything and want my last checkpoint back | In Source Control, hover over **Changes** and click the curved-arrow **Discard All Changes** icon. This throws away everything since your last commit. |
| The workspace won't open | Go to [github.com/codespaces](https://github.com/codespaces) and open your existing one from the list. |

## The rules

- No real personal information about anyone — all data is fake.
- No passwords, API keys or secrets in any file.
- No real payments, logins or forms that send data anywhere.
- No real company logos, brand names or copyrighted characters.
- Keep the footer saying this is a student prototype.
- No installs, no outside code libraries, no build tools.

## What's in this project

| File | What it is |
|---|---|
| `index.html` | The structure and text of your site |
| `styles.css` | How it looks: colours, fonts, spacing |
| `data.js` | All your fake data (listings, prices, users…) |
| `app.js` | What the site *does* when people click things |
| `project-notes/PROJECT_LOG.md` | Your team's record of prompts, problems and decisions |
| `project-notes/BUSINESS_CASE.md` | The business reasoning behind your prototype |
| `.github/copilot-instructions.md` | The rules Copilot follows in this project — don't delete it |

What exactly to hand in and how it's graded is in the term project brief on Moodle.
