# Project Structure

cnma-timesheet-management/
├── app/                        # Frontend applications
│   └── timesheet-app/          # Main React application
│       ├── src/                # Source code
│       │   ├── core/           # Core configuration (i18n, etc.)
│       │   ├── features/       # Business modules (admin, approvals, projects, etc.)
│       │   ├── shared/         # Reusable code (api, components, hooks, types)
│       │   ├── App.tsx         # Root component
│       │   └── main.tsx        # Application entry point
│       └── package.json        # Frontend dependencies
├── srv/                        # Backend service layer (SAP CAP)
│   ├── handlers/               # Custom business logic (TypeScript)
│   ├── admin-service.cds       # Admin service definitions
│   ├── timesheet-service.cds   # Main service definitions
│   └── package.json            # Backend dependencies
├── db/                         # Database layer
│   ├── data/                   # Initial/Mock data (.csv)
│   └── schema.cds              # Data models (CDS)
├── docs/                       # Project documentation
│   ├── project/                # Management & Structure
│   └── technical/              # Architecture & Technical guides
├── mta.yaml                    # Deployment configuration (SAP BTP)
├── xs-security.json            # Security & Role configuration
└── README.md                   # Project overview
