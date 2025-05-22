# AppNotas

## Required Runtimes, Engines, and Tools

Below is a list of all the runtimes, engines, and development tools required to build and run this project, including their specific recommended versions.

---

### Frontend

- **Node.js**: 18.17.0  
  _(Recommended: use v18.17.0 or higher, but tested with v18.17.0)_
- **npm**: 9.6.7  
  _(Recommended: use v9.6.7 or higher)_

#### Main JavaScript Libraries/Frameworks
- **React**: ^19.1.0
- **Create React App**: 5.0.1
- **react-router-dom**: ^7.6.0
- **@heroicons/react**: ^2.2.0
- **axios**: ^1.9.0
- **Tailwind CSS**: ^4.1.7
- **postcss**: ^8.5.3
- **autoprefixer**: ^10.4.21

---

### Backend

- **.NET SDK**: 9.0.100  
  _(Recommended: use .NET 9.0.100 or higher)_
- **ASP.NET Core Runtime**: 9.0.0

#### Main NuGet Packages
- Microsoft.AspNetCore.Authentication.JwtBearer: 9.0.5
- Microsoft.AspNetCore.Identity.EntityFrameworkCore: 9.0.5
- Microsoft.AspNetCore.OpenApi: 9.0.1
- Swashbuckle.AspNetCore: 8.1.1
- Microsoft.EntityFrameworkCore.Design: 9.0.5
- Microsoft.EntityFrameworkCore.SqlServer: 9.0.5

---

### Database

- **SQL Server**: 2019 or higher  
  _(Tested with SQL Server 2019, but compatible with later versions)_
- **SQL Server Management Studio** (Optional, for managing the database and executing scripts)

---

### Development Tools

- **Git**: 2.39.0 or higher
- **Visual Studio 2022** or **Visual Studio Code** (recommended for .NET and frontend development)
- **Command Line**: Bash, PowerShell, or CMD (for running helper scripts like `run-app.sh` and `run-backend.sh`)

---

## Default Credentials

| Username | Password |
| -------- | -------- |
| admin    | admin    |

---

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm start
