// Map a team key to its logo image (local require must be static)
export const teamLogos: Record<string, any> = {
    michigan:  require('./michigan_logo.png'),
    maryland:   require('./maryland_logo.png'),
    yeshiva: require('./yu_logo.png'),
    binghamton:    require('./binghamton_logo.png'),
  };
  
  // Optional fallback when a team has no logo key or file yet
  export const defaultLogo = require('./michigan_logo.png');
  
  // Helper to resolve a logo by team key
  export const getTeamLogo = (key?: string) => {
    if (!key) return defaultLogo;
    return teamLogos[key] ?? defaultLogo;
  };
  