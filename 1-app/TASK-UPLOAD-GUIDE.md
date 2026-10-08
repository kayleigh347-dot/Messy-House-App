# Add tasks from a spreadsheet

Open task-upload-template.csv in Excel, Numbers or Google Sheets. Replace the example rows with your tasks, save or download as CSV, then open More → Upload tasks in Mission Control.

| Column | What to enter |
| --- | --- |
| Task | Required task name, up to 180 characters. |
| Room | Required exact room name from your app. |
| Attention | yes or no; blank means no. |
| Doing Now | yes or no; blank means no. |
| Repeat Every | A whole number from 1 to 3650, or blank for a one-off task. |
| Repeat Unit | days or weeks. Blank means days. |
| Due Date | Optional date as YYYY-MM-DD. |
| Assigned To | Optional exact household-member name. |
| Notes | Optional extra instructions shown under the task. Notes never make a task recurring. |

**To make a task recurring, fill in Repeat Every and Repeat Unit.** For example, `1` and `weeks` repeats weekly; `30` and `days` repeats every 30 days. Leave Repeat Every blank for a one-off task, even if it has notes.

Review the preview before pressing Add these tasks. Incorrect rows are reported before anything is added. Existing tasks are never replaced. If an open task already has the same name in the same room, the preview asks whether to skip it or add another copy. Skip is selected initially. Repeated rows within the upload get the same choice.

Undo last import removes unchanged imported tasks; tasks you have since edited or completed are kept. Undo is available during the current app session. Upload at most 1,000 tasks and 1 MB per file.
