# Project Tracker User Manual

Version 1.0 · August 2026  
Audience: every signed-in role. This guide is organised by **user**, **capability**, and **workflow**.

---

## 1. Getting started (all users)

### Sign in

1. Open the application URL (locally `http://localhost:3000`, or your Vercel domain in production).
2. Enter your email and password.
3. Choose **Sign in**. Too many failed attempts lock sign-in for 15 minutes.

After sign-in you land on **Dashboard** (project managers, team leads, team members) or **Portfolio** (PMO, executives, HR, functional managers, system administrators).

Demo accounts (seeded environments only) all use password `Password123!`:

| Email | Role |
|---|---|
| developer@tracker.local | System administrator |
| admin@tracker.local | System administrator |
| pmo@tracker.local | PMO administrator |
| exec@tracker.local | Executive |
| pm@tracker.local | Project manager |
| lead@tracker.local | Team lead |
| member@tracker.local | Team member |
| fm@tracker.local | Functional manager |
| hr@tracker.local | HR reviewer |

### Account

Open **Account** at the bottom of the sidebar.

- **Change password:** current password plus a new password (at least 10 characters, upper, lower, and a number).
- **Deactivate account:** type your email to confirm. You are signed out immediately. An administrator must reactivate you.

### Common screen rules

- Empty lists explain what belongs there and offer one primary action (for example **Create project**).
- Destructive actions such as **Archive** ask for confirmation. Archived work can be **Restored** from the work list **Archived** filter.
- If you lack access you see **You do not have access**, not a blank page.
- Use **Skip to content** after the page loads if you navigate by keyboard.

### Language used in the product

| Action | Button / label |
|---|---|
| New record | Create |
| Persist edits | Save |
| Soft-delete | Archive |
| Undo archive | Restore |
| Session | Sign in / Sign out |
| Narrow a list | Apply filters |

---

## 2. Capability matrix

What each role can do. A blank cell means that role cannot perform the capability (the navigation item may also be hidden).

| Capability | System admin | PMO | Executive | Project manager | Team lead | Team member | Functional manager | HR reviewer |
|---|---|---|---|---|---|---|---|---|
| Dashboard | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Portfolio and executive reports | Yes | Yes | Yes | Yes | — | — | Yes | Yes |
| All projects (unrestricted) | Yes | Yes | Yes | Assigned only | Assigned only | Assigned only | Assigned only | Assigned only |
| Create / manage projects | Yes | Yes | — | Yes | — | — | — | — |
| Assess / accept deliverables | Yes | Yes | — | Yes | Yes | — | — | — |
| Team dashboard and review queue | Yes | Yes | — | Yes | Yes | — | — | — |
| Own scorecard, check-ins, annual review (view) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Lock scorecards / record check-ins | Yes | Yes | — | Yes | Yes | — | Yes | — |
| Override KPI results | Yes | Yes | — | Yes | — | — | Yes | — |
| Calibrate ratings | Yes | Yes | — | — | — | — | — | Yes |
| Correct a locked scorecard | Yes | Yes | — | — | — | — | — | Yes |
| Manage users, templates, retention | Yes | Yes | — | — | — | — | — | — |
| KRA/KPI catalog | Yes | Yes | — | — | — | — | — | Yes |
| Data-quality report | Yes | Yes | Yes | Yes | — | — | — | — |
| Jira adapter stub | Yes | — | — | — | — | — | — | — |

**Scorecard privacy:** you can always open your own scorecard. Your manager, HR, functional managers, PMO, and system administrators can open individual scorecards they are entitled to see. Executives do not open another person’s individual scorecard unless they are that person’s manager.

---

## 3. Shared workflows

These journeys appear for more than one role. Follow the steps for your role; skip steps you cannot see.

### 3.1 Join the platform (invite)

1. Administrator or PMO creates you under **Admin → Users & teams** (or you receive a temporary password).
2. If an invite link is issued, open `/invite/{token}` and set a password that meets the rules.
3. Sign in. Complete **Account** password change if you were given a temporary password.

### 3.2 Create a project (admin, PMO, project manager)

1. Open **Projects → Create project**.
2. Choose an approved **template** when one exists (milestones are created from it).
3. Enter name, unique **code**, business unit, strategic objective, sponsor, manager, dates, and charter/scope.
4. Choose **Create project**. Status starts as **Proposed**.
5. Open the project. Confirm goals with the team, assign members/stakeholders/approvers, and add at least one **Milestone** before moving status to **In Progress**.

### 3.3 Create and progress work

1. Open the project → **Work → Create work item**.
2. Choose type (Epic, Milestone, Deliverable, Task, Risk, Issue, and others). Status starts from that type’s workflow.
3. Assign an owner, due date, and acceptance criteria where required.
4. On the work item, use **Save** for field edits and the workflow buttons to move status (with a comment when the engine requires it).
5. Attach evidence (file or URL) before requesting review on deliverables.
6. **Archive** removes the item from active boards; **Archived** + **Restore** brings it back.

Typical deliverable path: Draft → In Progress → Ready for Review → Accepted or Rework Required → Closed.  
Owners cannot accept their own deliverable unless an authorised exception is recorded.

### 3.4 Assess a deliverable (admin, PMO, project manager, team lead)

1. Open **Reviews** or the work item when status is **Ready for Review**.
2. Score the quality dimensions and submit accept, rework, or reject.
3. Rework returns the item to the owner with comments; accept records the assessment in the audit trail.

### 3.5 Project health and status reporting

1. Open the project → **Health**. Calculated RAG (scope, schedule, delivery, quality, risks, resources, stakeholders) can be overridden by the project manager or PMO with a rationale.
2. Open **Status reports** and file the period update (accomplishments, plans, blockers, decisions, risks).
3. **Risks** holds risks, issues, and change requests with their own status paths.

### 3.6 Performance cycle (scorecards)

1. PMO/HR keep an approved KRA/KPI catalog whose weights total 100% per role.
2. A manager generates a member/team/project scorecard for a period.
3. Calculated KPIs refresh nightly (and on demand). Ticket counts are operational only; they are not the performance rating.
4. Lock the scorecard when the period is complete. Only admin, PMO, or HR can correct a locked card.
5. Monthly **Check-ins** capture progress and constraints. **Calibration** compares rating distributions. **Annual reviews** consolidate validated periods and never auto-finalise a rating.

### 3.7 Export and notifications

- **Reports** (portfolio-capable roles): filter and export CSV/PDF summaries. Those routes require a signed-in session.
- **Notifications**: overdue work, review queues, and data-quality alerts. Mark items read after you act.

---

## 4. Users, capabilities, and workflows

Each section lists **what you can do**, **what you see in the sidebar**, and **how you work day to day**.

### 4.1 Team member

**Capabilities:** view assigned projects and work; update your items; view your scorecard, check-ins, and annual review; change your password.

**Sidebar:** Dashboard, Projects, Scorecards, Check-ins, Annual reviews, Notifications, Account.

**Workflows**

1. Sign in → Dashboard. Confirm open work, overdue items, and anything due in 14 days.
2. Open a work item → update progress, comments, and evidence → move status (for example To Do → In Progress → In Review).
3. When a deliverable is ready, set **Ready for Review** (you cannot accept it yourself).
4. Open **Scorecards** for your current period. Use **Check-ins** only to read records about you unless you also hold a locking role.
5. Use **Notifications** for reminders. Use **Account** for password or deactivation.

### 4.2 Team lead

**Capabilities:** everything a member can do on assigned projects, plus assess/accept deliverables, team dashboard, review queue, lock scorecards, and record check-ins.

**Sidebar:** Dashboard, Projects, Team, Reviews, Scorecards, Check-ins, Annual reviews, Notifications, Account.

**Workflows**

1. Dashboard and **Team**: pending reviews, workload, and rework.
2. **Reviews**: score deliverables; do not accept work you own.
3. Project **Work**: assign items, unblock, and keep dates current.
4. **Scorecards / Check-ins**: generate or lock team-period cards you are allowed to manage; record monthly check-ins for direct reports.
5. Escalate blocked dependencies and red RAG to the project manager.

### 4.3 Project manager

**Capabilities:** create and manage projects you own; full work and health control; assess/accept; portfolio and reports; lock scorecards; override health and KPIs; data quality.

**Sidebar:** Dashboard, Portfolio, Projects, Team, Reviews, Scorecards, Check-ins, Annual reviews, Reports, Notifications, Account.

**Workflows**

1. **Create project** from a template → complete charter → add milestones → move to In Progress when the gate passes.
2. Weekly: Dashboard exceptions → Work board → Health (override only with rationale) → Status report.
3. **Reviews**: keep the accept/rework cycle moving.
4. **Portfolio** and **Reports**: RAG mix, overdue milestones, high risks; export when leadership asks.
5. **Scorecards**: lock period results for the project team; never use story points as the rating.

### 4.4 Functional manager

**Capabilities:** portfolio view; assigned-project visibility; own and team scorecards (where entitled); lock scorecards and check-ins; override KPIs; no project create and no deliverable assessment.

**Sidebar:** Dashboard, Portfolio, Projects, Scorecards, Check-ins, Annual reviews, Reports, Notifications, Account.

**Workflows**

1. **Portfolio / Reports**: delivery and risk for units you care about.
2. **Scorecards**: review people in your function; lock or override KPI results when you are the authorised manager.
3. **Check-ins**: record monthly feedback for reports.
4. Route delivery disputes to the project manager; route rating disputes to HR/PMO.

### 4.5 Executive

**Capabilities:** portfolio and all projects; reports and data quality; view team scorecards (not other individuals’ cards unless you manage them); no create-project, no assessment, no catalog admin.

**Sidebar:** Dashboard, Portfolio, Projects, Scorecards, Check-ins, Annual reviews, Reports, Notifications, Account.

**Workflows**

1. Sign in → **Portfolio**. Filter by status, RAG, and business unit (**Apply filters**).
2. Drill into red/amber projects → Health and Risks.
3. **Reports**: export a pack for steering committees.
4. **Data quality** (via Admin only if you also hold PMO/admin — executives use project Quality tabs and portfolio flags). Watch overdue reports and missing assignees.
5. Do not treat operational ticket counts as performance outcomes.

### 4.6 HR reviewer

**Capabilities:** portfolio; KRA/KPI catalog; calibration; correct locked scorecards; view scorecards per privacy rules; no project create and no Jira stub.

**Sidebar:** Dashboard, Portfolio, Projects, Scorecards, Check-ins, Calibration, Annual reviews, Reports, Notifications, Account.

The **Admin** sidebar is limited to system admin and PMO. HR reviewers work **Calibration**, **Scorecards**, and **Annual reviews** directly. Catalog edits are performed by PMO with HR agreement (HR has catalog permission, but the Admin nav requires template permission).

**Workflows**

1. Agree catalog weights (100% per role) with PMO before the cycle starts.
2. **Calibration**: compare rating distributions across teams; record outcomes.
3. Correct locked scorecards only with an audit-visible reason.
4. **Annual reviews**: confirm the record is a consolidation, not an auto-rating.
5. Protect individual scorecard access — executives should not browse people they do not manage.

### 4.7 PMO administrator

**Capabilities:** full governance except the Jira stub: users, templates, catalog, retention, audit, all project controls, assessments, calibration, locked-scorecard correction, portfolio, reports.

**Sidebar:** all primary items including **Admin**.

**Workflows**

1. **Admin → Project templates**: keep initiation templates and default milestones current.
2. **Admin → Users & teams**: invite users, set roles and managers, create teams.
3. **Admin → KRA/KPI catalog**: approve KRAs/KPIs; keep weights at 100%.
4. **Admin → Retention**: archive/delete policy for old operational data.
5. **Admin → Audit** and **Data quality**: investigate who changed what; chase missing data.
6. Support project managers on In Progress gates, health overrides, and report SLAs.

### 4.8 System administrator (including developer access)

**Capabilities:** PMO capabilities plus **Jira adapter (stub)** and unrestricted operational control. Seed user `developer@tracker.local` is this role.

**Sidebar:** all items including **Admin**.

**Workflows**

1. Everything in the PMO section.
2. **Admin → Jira adapter**: configuration stub only while `JIRA_SYNC_ENABLED` is false. Do not treat it as a live two-way sync.
3. **Account** and user reactivation after deactivation.
4. Production: confirm health endpoints `/api/health/live` and `/api/health/ready`; never place `AUTH_URL=http://localhost:3000` on Vercel.
5. Cron (platform): flags, notifications, KPI refresh, report distribution, retention — operators monitor these; end users see the results as notifications and refreshed KPIs.

---

## 5. Work-type status paths (reference)

Use the workflow buttons on the work item. Illegal transitions are blocked.

**Task / Sub-task / Issue:** To Do → In Progress → Blocked or In Review → Done (or Cancelled).

**Deliverable:** Draft → In Progress → Ready for Review → Rework Required, Accepted, or Rejected → Closed.

**Risk:** Identified → Analyzing → Mitigating / Accepted / Closed → Monitoring as needed.

**Change request:** Submitted → Under Review → Approved or Rejected → Implementing → Implemented → Closed.

**Epic, Milestone, Dependency, Decision:** To Do → In Progress → Done (or Cancelled).

**Project status:** Proposed → Initiating → Planning → In Progress (gate: manager, sponsor, dates, milestone plan) → On Hold / At Risk / Completed / Cancelled / Closed.

---

## 6. Support

- Permission errors: ask PMO to change your role or project membership.
- Failed saves: retry, then share the on-screen **reference ID** (if shown) and the time of the error. The UI never shows stack traces or secrets.
- Data restore: archived work items from the project **Work → Archived** list. Full database restore is an operations task (see `docs/OPERATIONS.md`).

This manual describes the product as implemented in the Project Tracker application. Jira sync remains optional and deferred.
