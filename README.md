# Rachel Wu - Portfolio Resume Website

A modern, interactive resume website for Rachel Wu, 3D Character Animator, designed for GitHub Pages hosting.

## Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Interactive Navigation**: Smooth scrolling with active section highlighting
- **Animated Timeline**: Professional experience displayed in an engaging timeline format
- **Modern UI/UX**: Clean, professional design with hover effects and animations
- **GitHub Pages Ready**: Optimized for static hosting

## Deployment to GitHub Pages

1. **Create a GitHub Repository**
   - Go to GitHub and create a new repository (e.g., `rachel-wu-resume`)
   - Initialize it with a README if desired

2. **Push Files to Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Resume website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on **Settings**
   - Scroll down to **Pages** section
   - Under **Source**, select `main` branch and `/ (root)` folder
   - Click **Save**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Local Development

To view the website locally:

1. Simply open `index.html` in a web browser, or
2. Use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```
   Then visit `http://localhost:8000`

## Customization

- **Colors**: Edit CSS variables in `styles.css` under `:root`
- **Content**: Update sections in `index.html`
- **Animations**: Modify JavaScript in `script.js`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is for personal use.


