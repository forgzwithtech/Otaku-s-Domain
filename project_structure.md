# 📁 OtakusDomainWeb - Project Structure

*Generated on: 8/24/2026, 10:09:10 PM*

## 📋 Quick Overview

| Metric | Value |
|--------|-------|
| 📄 Total Files | 58 |
| 📁 Total Folders | 18 |
| 🌳 Max Depth | 4 levels |
| 🛠️ Tech Stack | React, TypeScript, CSS, Node.js |

## ⭐ Important Files

- 🟡 🚫 **.gitignore** - Git ignore rules
- 🟡 🔒 **package-lock.json** - Dependency lock
- 🔴 📦 **package.json** - Package configuration
- 🔴 📖 **README.md** - Project documentation
- 🟡 🔷 **tsconfig.json** - TypeScript config

## 📊 File Statistics

### By File Type

- ⚛️ **.tsx** (React TypeScript files): 15 files (25.9%)
- 📄 **.cs** (Other files): 11 files (19.0%)
- ⚙️ **.json** (JSON files): 9 files (15.5%)
- 🖼️ **.png** (PNG images): 5 files (8.6%)
- 🎨 **.svg** (SVG images): 4 files (6.9%)
- 🔷 **.ts** (TypeScript files): 3 files (5.2%)
- 📖 **.md** (Markdown files): 2 files (3.4%)
- 🎨 **.css** (Stylesheets): 2 files (3.4%)
- 🚫 **.gitignore** (Git ignore): 1 files (1.7%)
- 🌐 **.html** (HTML files): 1 files (1.7%)
- 🖼️ **.jpg** (JPEG images): 1 files (1.7%)
- 🖼️ **.jpeg** (JPEG images): 1 files (1.7%)
- 📄 **.ogg** (Other files): 1 files (1.7%)
- 📄 **.csproj** (Other files): 1 files (1.7%)
- 📄 **.http** (Other files): 1 files (1.7%)

### By Category

- **React**: 15 files (25.9%)
- **Other**: 14 files (24.1%)
- **Assets**: 11 files (19.0%)
- **Config**: 9 files (15.5%)
- **TypeScript**: 3 files (5.2%)
- **Docs**: 2 files (3.4%)
- **Styles**: 2 files (3.4%)
- **DevOps**: 1 files (1.7%)
- **Web**: 1 files (1.7%)

### 📁 Largest Directories

- **root**: 58 files
- **client**: 42 files
- **client\src**: 29 files
- **server\OtakusDomainAPI**: 16 files
- **server**: 16 files

## 🌳 Directory Structure

```
OtakusDomainWeb/
├── 📂 client/
│   ├── 🟡 🚫 **.gitignore**
│   ├── ⚙️ .oxlintrc.json
│   ├── 🌐 index.html
│   ├── 🟡 🔒 **package-lock.json**
│   ├── 🔴 📦 **package.json**
│   ├── 📖 project_structure.md
│   ├── 🌐 public/
│   │   ├── 🎨 favicon.svg
│   │   └── 🎨 icons.svg
│   ├── 🔴 📖 **README.md**
│   ├── 📁 src/
│   │   ├── 🎨 App.css
│   │   ├── ⚛️ App.tsx
│   │   ├── 📦 assets/
│   │   │   ├── 🖼️ bluelogo.png
│   │   │   ├── 🖼️ drop.jpg
│   │   │   ├── 🖼️ fest.jpeg
│   │   │   ├── 🖼️ hero.png
│   │   │   ├── 📄 page.ogg
│   │   │   ├── 🖼️ rankings.png
│   │   │   ├── 🎨 react.svg
│   │   │   ├── 🖼️ Redlogo.png
│   │   │   ├── 🖼️ RedlogoDark.png
│   │   │   └── 🎨 vite.svg
│   │   ├── 🧩 components/
│   │   │   ├── 📂 dashboard/
│   │   │   │   └── ⚛️ DashboardHeader.tsx
│   │   │   ├── ⚛️ GlobalBackground.tsx
│   │   │   ├── ⚛️ GuildInvites.tsx
│   │   │   ├── ⚛️ Hero.tsx
│   │   │   ├── ⚛️ Login.tsx
│   │   │   ├── ⚛️ Navbar.tsx
│   │   │   ├── ⚛️ Register.tsx
│   │   │   ├── ⚛️ SocialAuthButtons.tsx
│   │   │   ├── ⚛️ SocialPulse.tsx
│   │   │   ├── ⚛️ SuggestionFooter.tsx
│   │   │   └── ⚛️ VaultGateway.tsx
│   │   ├── 🎨 index.css
│   │   ├── 📚 lib/
│   │   │   └── 🔷 supabase.ts
│   │   ├── ⚛️ main.tsx
│   │   ├── 📄 pages/
│   │   │   ├── ⚛️ AuthGateway.tsx
│   │   │   └── ⚛️ Home.tsx
│   │   └── 📂 services/
│   │   │   └── 🔷 api.ts
│   ├── ⚙️ tsconfig.app.json
│   ├── 🟡 🔷 **tsconfig.json**
│   ├── ⚙️ tsconfig.node.json
│   └── 🔷 vite.config.ts
└── 📂 server/
│   └── 📂 OtakusDomainAPI/
│   │   ├── ⚙️ appsettings.Development.json
│   │   ├── ⚙️ appsettings.json
│   │   ├── 📂 Controllers/
│   │   │   └── 📄 AuthController.cs
│   │   ├── 📂 Data/
│   │   │   └── 📄 AppDbContext.cs
│   │   ├── 📂 DTOs/
│   │   │   ├── 📄 SetGuildDto.cs
│   │   │   └── 📄 UserProfileDto.cs
│   │   ├── 📂 Enums/
│   │   │   ├── 📄 GuildFaction.cs
│   │   │   └── 📄 UserRole.cs
│   │   ├── 📂 Migrations/
│   │   │   ├── 📄 20260824191801_InitialAuthAndProfiles.cs
│   │   │   ├── 📄 20260824191801_InitialAuthAndProfiles.Designer.cs
│   │   │   └── 📄 AppDbContextModelSnapshot.cs
│   │   ├── 📂 Models/
│   │   │   └── 📄 UserProfile.cs
│   │   ├── 📄 OtakusDomainAPI.csproj
│   │   ├── 📄 OtakusDomainAPI.http
│   │   ├── 📄 Program.cs
│   │   └── 📂 Properties/
│   │   │   └── ⚙️ launchSettings.json
```

## 📖 Legend

### File Types
- 🚫 DevOps: Git ignore
- ⚙️ Config: JSON files
- 🌐 Web: HTML files
- 📖 Docs: Markdown files
- 🎨 Assets: SVG images
- 🎨 Styles: Stylesheets
- ⚛️ React: React TypeScript files
- 🖼️ Assets: PNG images
- 🖼️ Assets: JPEG images
- 🖼️ Assets: JPEG images
- 📄 Other: Other files
- 🔷 TypeScript: TypeScript files

### Importance Levels
- 🔴 Critical: Essential project files
- 🟡 High: Important configuration files
- 🔵 Medium: Helpful but not essential files
