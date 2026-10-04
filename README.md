# CampusFix demo

CampusFix is a small, presentation-ready campus issue tracker for NIT Arunachal Pradesh.

## Open the demo

Open `index.html` in a browser. The sign-in page appears first. Choose **Sign in** for a saved account or **Create account** to register in this browser, then choose Student or Administrator. No server setup is needed.

## Demo flow

1. Sign in as a student, select **Report an issue**, fill in the details, and submit it.
2. Sign out, sign in as Administrator, and find the new report in the complaint queue.
3. Change its status to **In Progress** or **Resolved**. Sign back in as the student to see the update.
4. If a new report has a similar category, location, and title to an open issue, the form offers to upvote the existing report or submit separately. Matching supporters appear on the report card.

Student: `student@nitap.ac.in` / `student123`  
Administrator: `admin@nitap.ac.in` / `admin123`

New accounts need an `@nitap.ac.in` email address. In this browser-only demo, account details are kept in local browser storage; this is for presentation use, not production authentication.

Reports are stored in the current browser when storage is available. The demo also remains usable for the current page session when browser storage is blocked. To restore the sample reports, clear the browser's site data for this page.

## Optional local server

If Node.js 18 or newer is installed, run `npm start` and open <http://localhost:3000>. The presentation interface runs in the browser; demo credentials are checked locally.
