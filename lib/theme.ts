// Runs before React hydrates so the theme applies without a flash.
// Reads the user's saved skin, falling back to the site-wide default the
// admin panel writes to `fb-skin-default`.
export const themeInitScript = `
(function(){try{
  var t=localStorage.getItem('fb-theme');if(t){document.documentElement.dataset.theme=t;}
  var s=localStorage.getItem('fb-skin')||localStorage.getItem('fb-skin-default');
  if(s&&s!=='modern'){document.documentElement.dataset.skin=s;}
}catch(e){}})();
`;

// A skin id is any string; the canonical list lives in Supabase (themes table).
export type Skin = string;

export const SKIN_STORAGE = {
  userChoice: "fb-skin",
  default: "fb-skin-default",
} as const;
