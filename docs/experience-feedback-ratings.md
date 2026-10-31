# Public experience rating chart

`/experience/` shows five rating averages above the public feedback cards. The chart uses the page's green palette, with vertical bars on desktop and horizontal bars below 600px. Scores are displayed to two decimal places on a five-point scale.

The public file `experience/feedback-ratings.json` is a snapshot of all monthly and event experience feedback, including imported history. Each metric uses only integer scores from 1 to 5, matching the admin dashboard. The chart is titled「問卷統計」and does not display a summary line with the total response count or snapshot date. No respondent details or individual answers are published, and the private feedback collection retains its existing access rules.

After new feedback arrives, refresh the snapshot with an authenticated Firebase CLI account:

```sh
npm run feedback:ratings
```

Review and deploy the updated JSON through the normal GitHub Pages workflow. This command reads only the five rating fields and writes counts and averages; it does not change Firestore records. The public page does not read the private collection or update the snapshot automatically.

Validation:

```sh
node --test tests/feedback-ratings.test.mjs tests/feedback-dashboard.test.mjs
```
