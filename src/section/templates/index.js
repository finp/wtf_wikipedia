const i18n = require('../../data/i18n');
const findRecursive = require('../../lib/recursive_match');
const parseInfobox = require('../../infobox/parse-infobox');
const infobox_reg = new RegExp('{{(' + i18n.infoboxes.join('|') + ')[: \n]', 'ig');

//create a list of templates we can understand, and will parse later
let inlineTemplates = require('../../sentence/templates/templates');
const parsers = require('./parsers');

//templates are usually '{{name|stuff}}'
const templateName = function(tmpl) {
  let name = null;
  //{{name|foo}}
  if (/^\{\{[^\n]+\|/.test(tmpl)) {
    name = (tmpl.match(/^\{\{(.+?)\|/) || [])[1];
  } else if (tmpl.indexOf('\n') !== -1) {
    // {{name \n...
    name = (tmpl.match(/^\{\{(.+?)\n/) || [])[1];
  } else {
    //{{name here}}
    name = (tmpl.match(/^\{\{(.+?)\}\}$/) || [])[1];
  }
  if (name) {
    name = name.trim().toLowerCase();
  }
  if (/cite [a-z0-9]/.test(name)) {
    name = 'citation';
  }
  return name;
};
// console.log(templateName('{{name|foo}}'));
// console.log(templateName('{{name here}}'));
// console.log(templateName('{{CITE book |title=the killer and the cartoons }}'));
// console.log(templateName(`{{name
// |key=val}}`));

//reduce the scary recursive situations
const findTemplates = function(r, wiki, options) {
  //grab {{template {{}} }} recursions
  let matches = findRecursive('{', '}', wiki);
  matches = matches.filter(s => s[0] && s[1] && s[0] === '{' && s[1] === '{');
  //ok, go through each one...
  matches.forEach(function(tmpl) {

    if (tmpl.match(infobox_reg, 'ig')) {
      if (options.infoboxes !== false) {
        let infobox = parseInfobox(tmpl);
        // infobox = new Infobox(infobox, tmpl);
        r.templates.push({
          template: 'infobox',
          data: infobox
        });
      }
      wiki = wiki.replace(tmpl, '');
      return;
    }

    //keep these ones, we'll parse them
    let name = templateName(tmpl);
    if (name === null) {
      wiki = wiki.replace(tmpl, '');
      return;
    }

    //sorta-keep nowrap template
    if (name === 'nowrap') {
      let inside = tmpl.match(/^\{\{nowrap *?\|(.*?)\}\}$/);
      if (inside) {
        wiki = wiki.replace(tmpl, inside[1]);
      }
    }
    //parse this template
    if (parsers.hasOwnProperty(name) === true) {
      let template = parsers[name](tmpl, options);
      if (template) {
        r.templates.push(template);
      }
      //remove it from the wiki document
      wiki = wiki.replace(tmpl, '');
    }
    if (inlineTemplates.hasOwnProperty(name) === true) {
      return;
    }
    //here: add custom parser support?

    //if it's not a known template, but it's recursive, remove it
    //(because it will be misread later-on)
    wiki = wiki.replace(tmpl, '');
  });
  // //ok, now that the scary recursion issues are gone, we can trust simple regex methods..
  // //kill the rest of templates
  wiki = wiki.replace(/\{\{ *?(^(main|wide)).*?\}\}/g, ''); //TODO:fix me
  return wiki;
};

module.exports = findTemplates;
