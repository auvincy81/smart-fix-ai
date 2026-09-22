# MekaReports shop beta checklist

Tester: __________  Shop: __________  Date: __________
Device/browser: __________  Role: __________

Use a clearly named test customer and vehicle. Do not change another customer's
records. This beta uses local development services. Email goes to the test
mailbox, text messages are not sent, and payment entry records money received;
it does not charge a card. Amounts are USD and pre-tax.

For each task mark **Pass / Problem / Not tried**. Record the page, expected
result, actual result, and a short description of anything confusing. Use
**Beta Feedback** in the menu to save an issue to your shop's local inbox.
Do not put passwords, payment-card details, or private document links in feedback.

| Task | What to check | Result / notes |
| --- | --- | --- |
| 1. Sign in | Reach the dashboard; a new account is asked to set up its shop. Visiting Login again should not show another login form. | |
| 2. Add a customer | Enter a name, phone, and email. Save once; find the customer by name or phone. Try an incomplete form and correct it. | |
| 3. Add a vehicle | Start from that customer. Check ownership, plate, and mileage before saving. | |
| 4. Decode a VIN | Enter a known 17-character VIN. Review decoded details. Try an invalid VIN and enter details manually. | |
| 5. Schedule an appointment | Choose the customer and vehicle, a New York date/time, and the concern. Confirm the displayed time. | |
| 6. Check in | Open the appointment and select Check In. Confirm its new status. | |
| 7. Create the work order | Customer, vehicle, concern, appointment, and mileage should carry over. Assign the technician. | |
| 8. Run AI diagnosis | Start from the work order. Check VIN and symptoms; add codes. Try a dashboard-warning photo and a part photo. Review safety advice and confirm findings with proper tests. | |
| 9. Save the diagnosis | Choose Save Diagnosis to Work Order. Open the saved result and return to the job. | |
| 10. Perform an inspection | Check Good, Attention, Urgent, and Not Checked. Add measurements, notes, and a recommendation. Save progress, leave, and resume. | |
| 11. Add an inspection photo | Select a JPEG, PNG, or WebP photo up to 5 MB. Add a useful caption. Confirm it appears after refresh. Convert HEIC first. | |
| 12. Finish the inspection | Review all findings and confirm completion. Unchecked items must remain visible. Try Pre-Inspection Readiness too; it is preparation, not an official inspection or certification. | |
| 13. Create a recommendation | Start from a finding or the work order. Explain what is needed and why in language the customer understands. | |
| 14. Build an estimate | Add two services and a part. Check labor, quantities, prices, fees, total, and customer explanations. Internal notes/costs must stay private. | |
| 15. Present the estimate | Review and present the version. Open its private approval link on a phone or signed-out browser. | |
| 16. Approve and decline | Approve one service and decline another. Confirm the decision once. Refresh: the recorded decision should remain, without another submission. | |
| 17. Start a repair | Only an approved service should start. The declined service should stay clearly declined. | |
| 18. Complete a service | Record work performed, installed parts, and a customer-appropriate completion note. Check completion time. | |
| 19. Complete the work order | Finish every approved service, enter mileage out, and confirm. Check vehicle mileage and appointment status. | |
| 20. Generate a repair report | Review the draft and finalize it. Check shop contact, customer, vehicle, approved/declined work, and future advice. | |
| 21. Create an invoice | Review and issue it. Only completed authorized work should be charged. Check the pre-tax total. | |
| 22. Record a partial payment | Enter an amount actually received, method, and optional transaction reference. Confirm the remaining balance. Never enter card or bank credentials. | |
| 23. View receipts | Open the partial-payment receipt. Record the final balance and verify a second receipt plus zero remaining balance. The first receipt must keep its original balance. | |
| 24. Email a document | Verify the recipient and preview. Send an approval, report, invoice, receipt, and reminder to the local test mailbox. Open each private link. | |
| 25. Try Text preview | Select Text, preview and copy the message/link. The app must say SMS provider not configured; history must stay Draft, without Sent or Delivered. | |
| 26. Create future service | Before closing the job, add a future recommendation with a date and/or mileage. Find it under Service Reminders and send a manual reminder. | |
| 27. Review history | Check both customer and vehicle pages for the visit, diagnosis, inspections, repair, documents, payment receipts, and messages. | |
| 28. Try other appointment outcomes | With separate test appointments, edit, cancel, and mark No Show. Check that the original completed visit stays intact. | |
| 29. Refresh and return | Refresh, close/reopen the browser, and sign in again. Saved data should remain. Unsaved form entries may be lost as stated on the page. | |
| 30. Sign out | Use the menu or Shop & Account. Protected pages should ask for sign-in; the local dashboard stays accessible. | |

## Phone and keyboard checks

- [ ] Try phone portrait, landscape, tablet, and desktop. Nothing important should run off the page.
- [ ] Open the menu on a short screen; reach Settings, Feedback, and Sign Out.
- [ ] Close the menu with Close and Escape; tab focus should stay inside while open.
- [ ] Tab through forms. Each control should have a useful name and visible focus.
- [ ] Tap inspection choices and primary actions with your usual work gloves.
- [ ] Try rapid repeat taps on Save, Check In, Upload, Approval, Payment, and Send.
      Verify one resulting record; do not repeat actual payments during testing.
- [ ] Open the same customer edit form in two tabs. Save one, then the other.
      The old form should ask you to reload instead of overwriting newer work.
- [ ] Ask the test coordinator to check owner, manager, advisor, and technician access.
      Technicians should perform shop work without estimate or payment management.

## Manual Print Preview / Save as PDF

These checks require a person using the browser's actual print dialog. They have
not been replaced by automated layout checks. Use Letter and A4, portrait, and a
multi-page example. Inspect the saved PDF as well as the preview.

| Document | Preview / saved PDF checked | Problems |
| --- | --- | --- |
| Final repair report | [ ] | |
| Issued invoice | [ ] | |
| Partial-payment receipt | [ ] | |
| Final-payment receipt | [ ] | |
| Completed multipoint inspection | [ ] | |
| Completed pre-inspection readiness | [ ] | |
| Saved diagnosis report | [ ] | |

Check every page for readable text, complete totals and contact details, sensible
page breaks, uncropped photos, and no shop sidebar, buttons, private notes, or
internal costs. Pre-inspection must retain its preparation-only disclaimer.
Check that print cancellation returns to the same usable page.

## Problem notes

Task number / page: __________

What I tried: __________

What I expected: __________

What actually happened: __________

Can I repeat it? Steps: __________

Impact: [ ] Cannot finish the job  [ ] Confusing  [ ] Minor inconvenience

Feedback saved in MekaReports? __________

## Limits of this beta

Production hosting/database, internet email, a real SMS provider, scheduled
reminders, tax/refund workflows, customer messaging inbox, team administration,
and native iOS/Android packaging are not included. Do not use this local build as
a production billing or official vehicle-inspection system. Coordinate backups
and access with the person running your test shop.
