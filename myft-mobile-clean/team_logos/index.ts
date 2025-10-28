// Map a team key to its logo image (local require must be static)
export const teamLogos: Record<string, any> = {
  baruch:       require('./baruch_logo.png'),
  binghamton:   require('./binghamton_logo.png'),
  brandeis:     require('./brandeis_logo.png'),
  brown:        require('./brown_logo.png'),
  columbia:     require('./columbia_logo.png'),
  fdu:          require('./fdu_logo.png'),
  florida:      require('./florida_logo.png'),
  georgia:      require('./georgia_logo.png'),
  harvard:      require('./harvard_logo.png'),
  illinois:     require('./illinois_logo.png'),
  indiana:      require('./indiana_logo.png'),
  maryland:     require('./maryland_logo.png'),
  michigan:     require('./michigan_logo.png'),
  minnesota:    require('./minnesota_logo.png'),
  northwestern: require('./northwestern_logo.png'),
  nyu:          require('./nyu_logo.png'),
  ohiostate:    require('./osu_logo.png'),
  penn:         require('./penn_logo.png'),
  princeton:    require('./princeton_logo.png'),
  queens:       require('./queens_logo.png'),
  rutgers:      require('./rutgers_logo.png'),
  stpeters:     require('./st-peters_logo.png'),
  syracuse:     require('./syracuse_logo.png'),
  texas:        require('./texas_logo.png'),
  touro:        require('./touro_logo.png'),
  washu:        require('./washu_logo.png'),
  wisconsin:    require('./wisconsin_logo.png'),
  yeshiva:      require('./yu_logo.png')
};

// Optional fallback when a team has no logo key or file yet
export const defaultLogo = require('./michigan_logo.png');

// Helper to resolve a logo by team key
export const getTeamLogo = (key?: string) => {
  if (!key) return defaultLogo;

  // normalize to lowercase, remove spaces & special chars
  const normalized = key
    .toLowerCase()
    .replace(/\s+/g, '')        // remove spaces
    .replace(/[^a-z0-9]/g, ''); // strip special chars

  return teamLogos[normalized] ?? defaultLogo;
};
