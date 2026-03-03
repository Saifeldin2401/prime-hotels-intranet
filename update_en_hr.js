const fs = require('fs');
const path = 'src/i18n/locales/en/hr.json';
const hr = JSON.parse(fs.readFileSync(path, 'utf8'));

hr.leave_requests.balance = {
  total: "Total Balance",
  used: "Used",
  pending: "Pending",
  remaining: "Remaining"
};

hr.leave_requests.form.submit_btn = "Submit New Request";
hr.leave_requests.form.insufficient_balance = "Insufficient balance. You only have {{remaining}} days remaining.";
hr.leave_requests.list.cancel_confirm = "Are you sure you want to cancel this leave request?";

fs.writeFileSync(path, JSON.stringify(hr, null, 4));
