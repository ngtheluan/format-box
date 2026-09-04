// Runs before React hydrates so the theme applies without a flash.
export const themeInitScript = `
(function(){try{var t=localStorage.getItem('fb-theme');if(t){document.documentElement.dataset.theme=t;}}catch(e){}})();
`;
