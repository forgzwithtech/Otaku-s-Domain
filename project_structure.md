# 📁 OtakusDomainWeb - Project Structure

*Generated on: 9/1/2026, 9:23:16 AM*

## 📋 Quick Overview

| Metric | Value |
|--------|-------|
| 📄 Total Files | 124 |
| 📁 Total Folders | 27 |
| 🌳 Max Depth | 4 levels |
| 🛠️ Tech Stack | React, TypeScript, CSS, Node.js |

## ⭐ Important Files

- 🟡 🚫 **.gitignore** - Git ignore rules
- 🟡 🚫 **.gitignore** - Git ignore rules
- 🟡 🔒 **package-lock.json** - Dependency lock
- 🔴 📦 **package.json** - Package configuration
- 🔴 📖 **README.md** - Project documentation
- 🟡 🔷 **tsconfig.json** - TypeScript config

## 📊 File Statistics

### By File Type

- ⚛️ **.tsx** (React TypeScript files): 42 files (33.9%)
- 📄 **.cs** (Other files): 38 files (30.6%)
- 🔷 **.ts** (TypeScript files): 11 files (8.9%)
- ⚙️ **.json** (JSON files): 9 files (7.3%)
- 🖼️ **.png** (PNG images): 6 files (4.8%)
- 🎨 **.svg** (SVG images): 4 files (3.2%)
- 📖 **.md** (Markdown files): 3 files (2.4%)
- 🚫 **.gitignore** (Git ignore): 2 files (1.6%)
- 🎨 **.css** (Stylesheets): 2 files (1.6%)
- 🌐 **.html** (HTML files): 1 files (0.8%)
- 🖼️ **.jpg** (JPEG images): 1 files (0.8%)
- 🖼️ **.jpeg** (JPEG images): 1 files (0.8%)
- 📄 **.mp4** (Other files): 1 files (0.8%)
- 📄 **.ogg** (Other files): 1 files (0.8%)
- 📄 **.csproj** (Other files): 1 files (0.8%)
- 📄 **.http** (Other files): 1 files (0.8%)

### By Category

- **React**: 42 files (33.9%)
- **Other**: 42 files (33.9%)
- **Assets**: 12 files (9.7%)
- **TypeScript**: 11 files (8.9%)
- **Config**: 9 files (7.3%)
- **Docs**: 3 files (2.4%)
- **DevOps**: 2 files (1.6%)
- **Styles**: 2 files (1.6%)
- **Web**: 1 files (0.8%)

### 📁 Largest Directories

- **root**: 124 files
- **client**: 79 files
- **client\src**: 66 files
- **server\OtakusDomainAPI**: 43 files
- **server**: 43 files

## 🌳 Directory Structure

```
OtakusDomainWeb/
├── 🟡 🚫 **.gitignore**
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
│   │   │   ├── 🖼️ cover.png
│   │   │   ├── 🖼️ drop.jpg
│   │   │   ├── 🖼️ fest.jpeg
│   │   │   ├── 🖼️ hero.png
│   │   │   ├── 📄 merchvid.mp4
│   │   │   ├── 📄 page.ogg
│   │   │   ├── 🖼️ rankings.png
│   │   │   ├── 🎨 react.svg
│   │   │   ├── 🖼️ Redlogo.png
│   │   │   ├── 🖼️ RedlogoDark.png
│   │   │   └── 🎨 vite.svg
│   │   ├── 🧩 components/
│   │   │   ├── 📂 admin/
│   │   │   │   ├── ⚛️ AdminTelemetry.tsx
│   │   │   │   ├── ⚛️ EventsManager.tsx
│   │   │   │   ├── ⚛️ RecruitmentQueue.tsx
│   │   │   │   ├── ⚛️ SlideManager.tsx
│   │   │   │   ├── ⚛️ SponsorsManager.tsx
│   │   │   │   ├── ⚛️ StoreManager.tsx
│   │   │   │   ├── ⚛️ TrialPipeline.tsx
│   │   │   │   ├── ⚛️ TrialScheduler.tsx
│   │   │   │   └── ⚛️ UserManagement.tsx
│   │   │   ├── 📂 dashboard/
│   │   │   │   ├── ⚛️ DashboardHeader.tsx
│   │   │   │   └── ⚛️ WalletStatsCard.tsx
│   │   │   ├── 📂 forum/
│   │   │   │   ├── ⚛️ ForumFloatingDock.tsx
│   │   │   │   └── ⚛️ GenderGatekeeperModal.tsx
│   │   │   ├── ⚛️ GlobalBackground.tsx
│   │   │   ├── ⚛️ GuildInvites.tsx
│   │   │   ├── ⚛️ Hero.tsx
│   │   │   ├── ⚛️ Login.tsx
│   │   │   ├── ⚛️ Navbar.tsx
│   │   │   ├── ⚛️ Register.tsx
│   │   │   ├── ⚛️ SocialAuthButtons.tsx
│   │   │   ├── ⚛️ SocialPulse.tsx
│   │   │   ├── 📂 store/
│   │   │   │   └── ⚛️ StoreNavbar.tsx
│   │   │   ├── ⚛️ SuggestionFooter.tsx
│   │   │   └── ⚛️ VaultGateway.tsx
│   │   ├── 🎨 index.css
│   │   ├── 📚 lib/
│   │   │   └── 🔷 supabase.ts
│   │   ├── ⚛️ main.tsx
│   │   ├── 📄 pages/
│   │   │   ├── ⚛️ AuthGateway.tsx
│   │   │   ├── ⚛️ Dashboard.tsx
│   │   │   ├── 📂 events/
│   │   │   │   └── ⚛️ PaymentSuccessful.tsx
│   │   │   ├── ⚛️ Events.tsx
│   │   │   ├── 📂 forum/
│   │   │   │   └── ⚛️ ForumThreadDetails.tsx
│   │   │   ├── ⚛️ Forum.tsx
│   │   │   ├── ⚛️ Home.tsx
│   │   │   ├── 📂 interpool/
│   │   │   │   ├── ⚛️ Admin.tsx
│   │   │   │   ├── ⚛️ GateKeeeperScanner.tsx
│   │   │   │   └── ⚛️ ModeratorDashboard.tsx
│   │   │   ├── ⚛️ RedLightDistrict.tsx
│   │   │   ├── 📂 store/
│   │   │   │   ├── ⚛️ ProductDetails.tsx
│   │   │   │   └── ⚛️ StoreBag.tsx
│   │   │   ├── ⚛️ Store.tsx
│   │   │   ├── ⚛️ Vault.tsx
│   │   │   └── ⚛️ VaultMediaDetail.tsx
│   │   ├── 📂 services/
│   │   │   ├── 🔷 adminApi.ts
│   │   │   ├── 🔷 anilist.ts
│   │   │   ├── 🔷 api.ts
│   │   │   ├── 🔷 eventsApi.ts
│   │   │   ├── 🔷 forumApi.ts
│   │   │   ├── 🔷 mangaDexEngine.ts
│   │   │   ├── 🔷 storage.ts
│   │   │   └── 🔷 storeApi.ts
│   │   └── 🔧 utils/
│   │   │   └── 🔷 genter.ts
│   ├── ⚙️ tsconfig.app.json
│   ├── 🟡 🔷 **tsconfig.json**
│   ├── ⚙️ tsconfig.node.json
│   └── 🔷 vite.config.ts
├── 📖 project_structure.md
└── 📂 server/
│   └── 📂 OtakusDomainAPI/
│   │   ├── ⚙️ appsettings.Development.json
│   │   ├── ⚙️ appsettings.json
│   │   ├── 📂 Controllers/
│   │   │   ├── 📄 AdminController.cs
│   │   │   ├── 📄 AdminEventController.cs
│   │   │   ├── 📄 AdminStoreController.cs
│   │   │   ├── 📄 AuthController.cs
│   │   │   ├── 📄 EventController.cs
│   │   │   ├── 📄 ForumController.cs
│   │   │   ├── 📄 GuildController.cs
│   │   │   ├── 📄 LandingController.cs
│   │   │   ├── 📄 PaymentsController.cs
│   │   │   ├── 📄 QuestsController.cs
│   │   │   └── 📄 StoreController.cs
│   │   ├── 📂 Data/
│   │   │   └── 📄 AppDbContext.cs
│   │   ├── 📂 DTOs/
│   │   │   └── 📄 Dto.cs
│   │   ├── 📂 Enums/
│   │   │   ├── 📄 GuildFaction.cs
│   │   │   └── 📄 UserRole.cs
│   │   ├── 📂 Migrations/
│   │   │   ├── 📄 20260824191801_InitialAuthAndProfiles.cs
│   │   │   ├── 📄 20260824191801_InitialAuthAndProfiles.Designer.cs
│   │   │   ├── 📄 20260824225827_heroandnav.cs
│   │   │   ├── 📄 20260824225827_heroandnav.Designer.cs
│   │   │   ├── 📄 20260824234400_heroa.cs
│   │   │   ├── 📄 20260824234400_heroa.Designer.cs
│   │   │   ├── 📄 20260825004002_sponsors.cs
│   │   │   ├── 📄 20260825004002_sponsors.Designer.cs
│   │   │   ├── 📄 20260825041012_somestuff.cs
│   │   │   ├── 📄 20260825041012_somestuff.Designer.cs
│   │   │   ├── 📄 20260825103710_somestufelsef.cs
│   │   │   ├── 📄 20260825103710_somestufelsef.Designer.cs
│   │   │   └── 📄 AppDbContextModelSnapshot.cs
│   │   ├── 📂 Models/
│   │   │   ├── 📄 Event.cs
│   │   │   ├── 📄 Forum.cs
│   │   │   ├── 📄 LandingContent.cs
│   │   │   ├── 📄 RecruitmentSubmission.cs
│   │   │   ├── 📄 Sponsors.cs
│   │   │   ├── 📄 Store.cs
│   │   │   └── 📄 UserProfile.cs
│   │   ├── 📄 OtakusDomainAPI.csproj
│   │   ├── 📄 OtakusDomainAPI.http
│   │   ├── 📄 Program.cs
│   │   ├── 📂 Properties/
│   │   │   └── ⚙️ launchSettings.json
│   │   └── 📂 Services/
│   │   │   ├── 📄 EmailService.cs
│   │   │   └── 📄 PaystackService.cs
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
