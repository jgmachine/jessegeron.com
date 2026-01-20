# jessegeron.com

A modern portfolio website built with Astro and Tailwind CSS.

## Features

- **Blog**: Write and organize blog posts with tags and categories
- **AI Resources**: Curated collection of AI tools and guides, organized by topic
- **Projects**: Showcase portfolio projects with detailed descriptions
- **About Page**: Personal information and contact details
- **Fast Performance**: Built with Astro's island architecture for optimal loading speeds
- **Responsive Design**: Tailwind CSS for beautiful, mobile-friendly layouts

## Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable Astro components
│   │   └── Card.astro   # Card component for blog/projects
│   ├── content/         # Markdown content
│   │   ├── blog/        # Blog posts
│   │   ├── ai-resources/# AI resources
│   │   └── projects/    # Project descriptions
│   ├── layouts/         # Page layouts
│   │   └── Layout.astro # Main layout with header/footer
│   ├── pages/           # Route pages
│   │   ├── index.astro          # Homepage
│   │   ├── about.astro          # About page
│   │   ├── blog/
│   │   │   ├── index.astro      # Blog listing
│   │   │   └── [...slug].astro  # Individual blog posts
│   │   ├── ai-resources/
│   │   │   ├── index.astro      # AI resources listing
│   │   │   └── [...slug].astro  # Individual resources
│   │   └── projects/
│   │       ├── index.astro      # Projects listing
│   │       └── [...slug].astro  # Individual projects
│   ├── styles/          # Global styles
│   │   └── global.css   # Tailwind CSS imports
│   └── content.config.ts # Content collections schema
├── astro.config.mjs     # Astro configuration
└── package.json         # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Visit http://localhost:4321 to see your site.

### Building for Production

```bash
npm run build
```

The built site will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Adding Content

### Blog Posts

Create a new `.md` file in `src/content/blog/`:

```markdown
---
title: "Your Post Title"
description: "Brief description"
pubDate: 2026-01-19
tags: ["tag1", "tag2"]
category: "Category Name"
draft: false
---

Your content here...
```

### AI Resources

Create a new `.md` file in `src/content/ai-resources/`:

```markdown
---
title: "Resource Title"
description: "What this resource is about"
topic: "Topic Name"
tags: ["tag1", "tag2"]
url: "https://example.com"
featured: true
---

Detailed information about the resource...
```

### Projects

Create a new `.md` file in `src/content/projects/`:

```markdown
---
title: "Project Name"
description: "Project description"
tags: ["tech1", "tech2"]
github: "https://github.com/username/repo"
demo: "https://demo.example.com"
featured: true
order: 1
---

Project details and highlights...
```

## Customization

### Styling

- Tailwind CSS classes are used throughout
- Modify `src/styles/global.css` for global styles
- Dark mode is supported via Tailwind's dark mode classes

### Navigation

Edit the header in `src/layouts/Layout.astro` to add or modify navigation links.

### Homepage

Customize the hero section and featured content in `src/pages/index.astro`.

### About Page

Update your personal information in `src/pages/about.astro`.

## Tech Stack

- **Framework**: [Astro](https://astro.build)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Content**: Markdown with frontmatter
- **Type Safety**: TypeScript

## Deployment

This site can be deployed to:

- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting service

Simply connect your repository and the hosting service will automatically build and deploy your site.

## License

MIT
