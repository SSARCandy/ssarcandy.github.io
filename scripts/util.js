
function date_formatter(d) {
  const mm = d.getMonth() + 1; // getMonth() is zero-based
  const dd = d.getDate();

  return [d.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('-');
};


module.exports = {
  date_formatter,
};