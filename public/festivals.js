// Festival calendar. Each festival shows a "See … lights" button from `from` to `to` (inclusive).
// Moon-based dates are approximate; adjust them here each year.
// night: switch to night view · fireworks · lanterns (hanging at street lamps) · tree (town Christmas tree) · powder (Holi colours)
export const FESTIVALS = [
  { id: 'diwali', name: 'Diwali', button: 'See Diwali lights', from: '2026-11-04', to: '2026-11-11', night: true, fireworks: true, diyas: true,
    colors: ['#ffb703', '#fb8500', '#ff4d6d', '#ffd60a', '#ff9e00'], greeting: 'Happy Diwali! 🪔' },
  { id: 'christmas', name: 'Christmas', button: 'See Christmas lights', from: '2026-12-20', to: '2026-12-27', night: true, tree: true,
    colors: ['#e63946', '#2a9d8f', '#ffd166', '#ffffff', '#4cc9f0'], greeting: 'Merry Christmas! 🎄' },
  { id: 'newyear', name: 'New Year', button: 'See New Year fireworks', from: '2026-12-31', to: '2027-01-02', night: true, fireworks: true,
    colors: ['#ffd166', '#ffffff', '#4cc9f0', '#f72585', '#7bf1a8'], greeting: 'Happy New Year 2027! 🎆' },
  { id: 'lunar', name: 'Lunar New Year', button: 'See Lunar New Year lanterns', from: '2027-02-04', to: '2027-02-10', night: true, fireworks: true, lanterns: true,
    colors: ['#e63946', '#ffd166', '#ff7b00'], greeting: 'Happy Lunar New Year! 🏮' },
  { id: 'eid', name: 'Eid al-Fitr', button: 'See Eid lights', from: '2027-03-08', to: '2027-03-12', night: true, lanterns: true,
    colors: ['#80ffdb', '#ffd166', '#ffffff', '#72efdd'], greeting: 'Eid Mubarak! 🌙' },
  { id: 'holi', name: 'Holi', button: 'Play Holi colours', from: '2027-03-21', to: '2027-03-23', night: false, powder: true,
    colors: ['#ff006e', '#8338ec', '#3a86ff', '#ffbe0b', '#06d6a0', '#fb5607'], greeting: 'Happy Holi! 🎨' },
  { id: 'eidadha', name: 'Eid al-Adha', button: 'See Eid lights', from: '2027-05-15', to: '2027-05-19', night: true, lanterns: true,
    colors: ['#80ffdb', '#ffd166', '#ffffff'], greeting: 'Eid Mubarak! 🌙' },
  { id: 'diwali', name: 'Diwali', button: 'See Diwali lights', from: '2027-10-26', to: '2027-11-01', night: true, fireworks: true, diyas: true,
    colors: ['#ffb703', '#fb8500', '#ff4d6d', '#ffd60a', '#ff9e00'], greeting: 'Happy Diwali! 🪔' },
];

// Today's festival, or one forced with ?festival=<id> (handy for testing).
export function currentFestival(now = new Date()) {
  const forced = new URLSearchParams(location.search).get('festival');
  if (forced) return FESTIVALS.find((f) => f.id === forced) || null;
  const d = now.toISOString().slice(0, 10);
  return FESTIVALS.find((f) => d >= f.from && d <= f.to) || null;
}
