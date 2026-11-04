# Page Turning Frame Reader

Act as a senior full-stack developer, UI/UX designer, AI engineer and mobile app developer.

Build a complete, production-ready AI application named **BookScan AI**.

The application must work on:
1. Android
2. Web browsers
3. Mobile responsive devices

The main purpose is to convert book videos into high-quality, properly ordered PDF documents using AI.

## 1. BRAND IDENTITY & DESIGN

App name: BookScan AI
Tagline: "Turn Every Page Into a Digital Book."

Use the exact visual direction of the provided yellow and golden colour palette reference image.

Official colour palette:
- Golden Brown: #CD8B09
- Amber: #E9A413
- Golden Yellow: #FCC724
- Soft Yellow: #FFF36C
- Pale Lemon: #FDFEAD
- Cream: #FDFBD5

Design rules:
- Use cream and pale yellow backgrounds.
- Use golden gradients for hero sections and important buttons.
- Use white cards with subtle shadows.
- Use dark brown typography for readability.
- Use rounded corners and elegant spacing.
- Add beautiful micro-animations and smooth transitions.
- Use modern typography such as Inter or Poppins.
- Create a consistent design system across every screen.
- Never compromise readability for decorative effects.

The overall interface should look like a premium modern SaaS application.

## 2. AUTHENTICATION SYSTEM

Create a completely free registration and login system.

Provide three authentication methods:
1. Email and Password
2. Google Sign-In
3. Mobile Number with OTP

Requirements:
- Free account registration.
- Login and logout.
- Forgot password.
- Email verification.
- Secure session management.
- User profile.
- Account settings.
- Protected dashboard.
- Remember login session securely.

Use lovable Authentication.
Google login and phone OTP must be fully functional after configuration.
Do not create fake authentication or simulated successful login.

## 3. HOME PAGE

Create a beautiful landing page.

Include:
- Premium BookScan AI logo.
- Navigation bar.
- Home.
- Features.
- How It Works.
- Login.
- Sign Up.

Hero section headline:
"Your Books, Digitized in Seconds."

Subtitle:
"Upload a video of your book and let AI turn every page into a clean, organized PDF."

Primary button: Start Scanning
Secondary button: Explore Features

Add a beautiful illustration showing a book transforming into a digital PDF.

## 4. USER DASHBOARD

After login, display a modern dashboard.

Include:
- Welcome message.
- Upload Video button.
- Scan Book button.
- Recent PDF files.
- Total pages scanned.
- Total PDFs created.
- Processing history.
- User profile.
- Settings.

Make the dashboard responsive for mobile and desktop.

## 5. VIDEO TO PDF ENGINE

This is the main feature of the application.

Allow users to:
- Upload MP4, MOV and other supported video formats.
- Record a video using their phone camera.
- Preview the uploaded video.
- Select automatic extraction.
- Select manual extraction.

AUTOMATIC MODE:

AI should:
- Analyze the video frame by frame.
- Detect when a new book page appears.
- Identify page boundaries.
- Extract the clearest frame for each page.
- Detect duplicate frames.
- Remove blurry frames when a better frame exists.
- Maintain page order.
- Detect missing or repeated pages where possible.

MANUAL MODE:

Allow users to:
- Select individual video frames.
- Preview frames.
- Select or deselect pages.
- Crop pages.
- Rotate pages.
- Reorder pages.
- Delete unwanted pages.
- Add additional images.

## 6. AI IMAGE PROCESSING

After extracting pages, process them automatically.

Features:
- Perspective correction.
- Automatic page cropping.
- Brightness adjustment.
- Contrast enhancement.
- Shadow reduction.
- Noise reduction.
- Image sharpening.
- Document edge detection.
- Background cleanup.

Provide three image modes:
1. Original
2. Clean Scan
3. Black & White Document

Do not artificially invent missing text or content.

## 7. OCR TEXT RECOGNITION

Integrate OCR for:
- English
- Hindi

Features:
- Extract text from scanned pages.
- Preserve page order.
- Generate searchable PDFs.
- Allow users to copy extracted text.
- Support mixed Hindi and English documents.

## 8. PDF GENERATOR

Create a professional PDF generation system.

Options:
- A4 size.
- Original page size.
- Portrait and landscape.
- Adjustable margins.
- Page numbering.
- PDF title.
- PDF preview.
- Reorder pages.
- Download PDF.
- Share PDF.

Allow users to select:
- Image-based PDF.
- Searchable PDF with OCR text.

PDF generation must preserve image quality and page orientation.

## 9. MY LIBRARY

Create a personal PDF library.

Features:
- All created PDFs.
- Search PDFs.
- Rename files.
- Preview documents.
- Download documents.
- Delete documents.
- Sort by date.
- Display page count and file size.

Each user must only be able to access their own private documents.

## 10. SETTINGS

Include:
- Profile settings.
- Change password.
- Language settings.
- Notification settings.
- Privacy policy.
- Terms and conditions.
- Delete account.
- Logout.

## 11. BACKEND & TECHNOLOGY

Recommended technology stack:

Frontend:
- React
- TypeScript
- Tailwind CSS
- Responsive design

Mobile:
- Capacitor for Android packaging.

Backend:
- Firebase Authentication.
- Firebase Firestore.
- Firebase Storage.

AI processing:
- Python.
- OpenCV for video frame extraction and page detection.
- Image processing pipeline for perspective correction.
- OCR engine supporting Hindi and English.
- Secure backend API for processing large videos.

PDF:
- PDF generation library with searchable text support.

Build reusable components and clean, maintainable code.

## 12. SECURITY & PRIVACY

- Protect user accounts.
- Use secure authentication.
- Validate uploaded files.
- Apply upload size limits.
- Secure storage access.
- Use private user-specific file permissions.
- Never expose API keys or secrets.
- Provide file deletion controls.
- Do not store user videos longer than necessary.
- Respect copyright and document ownership.
- Do not bypass DRM or access restrictions.

## 13. PERFORMANCE

- Show upload progress.
- Show extraction progress.
- Show PDF generation progress.
- Handle large video files safely.
- Use background processing for long jobs.
- Allow users to cancel processing.
- Show clear error messages.
- Avoid duplicate processing.

## 14. FINAL UI REQUIREMENTS

Every screen must follow the same golden-yellow and cream branding.

Create:
- Landing page.
- Login page.
- Signup page.
- Forgot password page.
- Dashboard.
- Video upload screen.
- Automatic scanning screen.
- Manual page selection screen.
- Image editing screen.
- PDF preview screen.
- My Library.
- Profile.
- Settings.

The application must feel like a real premium product, not a basic demo or template.

## 15. FINAL DELIVERY

Deliver:
- Complete frontend source code.
- Complete backend source code.
- Firebase integration.
- Working authentication.
- Working video processing.
- Working PDF generation.
- Responsive web application.
- Android-ready project.
- Installation instructions.
- Environment configuration instructions.
- Deployment instructions.

IMPORTANT:

Do not just create a visual prototype.

Build actual working functionality. Clearly identify features that require external API keys or Firebase configuration. Never display fake success messages for features that are not connected.

The final product name must always be:

BOOKSCAN AI

Tagline:

"Scan Smart. Read Anywhere."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://page-turning-frame-reader.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/48211b78-827f-42c6-920d-37f62c8a3acb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
