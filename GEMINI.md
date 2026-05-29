# Project: SSARCandy's Blog

This is a personal blog powered by [Hexo](https://hexo.io/) and managed with Node.js. It features a custom theme, automated deployment, and integration with third-party services like Flickr and Google Analytics.

## Project Overview

- **Core Tech**: Hexo (v7+), JavaScript (ES6+), Webpack (v5+).
- **Theme**: Custom theme `ssarcandy` (modified from `hexo-theme-indigo`).
- **Architecture**:
    - **Source Content**: Markdown posts reside in `source/_posts/`.
    - **Theme Assets**: Theme-specific JavaScript is located in `themes/ssarcandy/js/` and bundled via Webpack.
    - **Styling**: Uses LESS and Stylus for theme styling.
    - **Integration**: Fetches Google Analytics data for pageview counts via `helper/ga_pageview.js`.

## Building and Running

### Development

To run the blog locally with live reloading, you typically need two terminal sessions:

1.  **Watch Assets**:
    ```sh
    npx webpack --watch
    ```
    This bundles theme JavaScript and outputs it to `themes/ssarcandy/source/js/`.

2.  **Start Hexo Server**:
    ```sh
    npm run dev
    ```
    This starts the Hexo server in debug mode (usually at `http://localhost:3080`).

### Production Build

To generate the static site for deployment:

```sh
npm run build
```
This command executes a multi-step process:
1.  `build:pageview`: Fetches GA data (requires credentials).
2.  `build:webpack`: Bundles theme assets in production mode.
3.  `build:hexo`: Runs `hexo generate` to create the final static files in `public/`.

### Deployment

The project is configured for automated deployment via GitHub Actions:
- **Source Branch**: `develop`
- **Publish Branch**: `master` (GitHub Pages)
- **Trigger**: Pushes to `develop` or a daily schedule.

Manual deployment can be triggered via:
```sh
npm run deploy
```

## Development Conventions

- **Linting**: Use `npm run lint` to check theme JavaScript code quality.
- **Theme Layouts**: Main layouts are in `themes/ssarcandy/layout/` using EJS templates.
- **Configuration**:
    - Global site settings: `_config.yml`
    - Theme-specific settings: `themes/ssarcandy/_config.yml`
- **Assets Management**:
    - Do not edit files in `themes/ssarcandy/source/js/` directly; they are overwritten by Webpack.
    - Source assets are in `themes/ssarcandy/js/`.
- **Environment**: Node.js v20+ is recommended as per the GitHub Actions configuration.
