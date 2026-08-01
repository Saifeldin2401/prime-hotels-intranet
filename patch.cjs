const fs = require('fs');
const file = 'c:/Users/mahro/Downloads/prime-hotels-intranet/src/pages/public/PublicHome.tsx';
let c = fs.readFileSync(file, 'utf8');

// Section 2B
c = c.replace(
  /<section id="why-altus"([\s\S]*?)<div className="max-w-6xl mx-auto">/,
  '<section id="why-altus"$1<FadeInSection className="max-w-6xl mx-auto">'
);
c = c.replace(
  /<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba\(255,255,255,0\.08\)' }}>/,
  '<StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: \'rgba(255,255,255,0.08)\' }}>'
);
c = c.replace(
  /\}\.map\(\(edge\) => \([\s\S]*?<div key=\{edge\.title\}/g,
  '}.map((edge) => (\n              <motion.div key={edge.title} variants={staggerItem}'
);
c = c.replace(
  /edge\.desc\}<\/p>\n\s*<\/div>\n\s*\)\)}/g,
  'edge.desc}</p>\n              </motion.div>\n            ))}'
);
c = c.replace(
  /\)\)}\n\s*<\/div>\n\n\s*<div className="mt-10 p-8 sm:p-10/g,
  '))}\n          </StaggerChildren>\n\n          <div className="mt-10 p-8 sm:p-10'
);
c = c.replace(
  /digital innovation\.'\}\n\s*<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*<\/section>\n\n\s*\{\/\* ═══════════════ SECTION 3/g,
  'digital innovation.\'}\n            </p>\n          </div>\n        </FadeInSection>\n      </section>\n\n      {/* ═══════════════ SECTION 3'
);

// Section 3
c = c.replace(
  /<section id="practices"([\s\S]*?)<div className="max-w-6xl mx-auto">\n\s*<div className="mb-12">/,
  '<section id="practices"$1<div className="max-w-6xl mx-auto">\n          <FadeInSection className="mb-12">'
);
c = c.replace(
  /<\/h2>\n\s*<\/div>\n\n\s*<div className="grid md:grid-cols-2 gap-6">/,
  '</h2>\n          </FadeInSection>\n\n          <StaggerChildren className="grid md:grid-cols-2 gap-6">'
);
c = c.replace(
  /\)\.map\(\(pr\) => \([\s\S]*?<div\n\s*key=\{pr\.id\}/g,
  ').map((pr) => (\n              <motion.div\n                variants={staggerItem}\n                key={pr.id}'
);
c = c.replace(
  /<ArrowRight className="w-3\.5 h-3\.5 rtl:rotate-180" \/>\n\s*<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*\)\)}/g,
  '<ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />\n                  </button>\n                </div>\n              </motion.div>\n            ))}'
);
c = c.replace(
  /\)\)}\n\s*<\/div>\n\s*<\/div>\n\s*<\/section>\n\n\s*\{\/\* ═══════════════ SECTION 4/g,
  '))}\n          </StaggerChildren>\n        </div>\n      </section>\n\n      {/* ═══════════════ SECTION 4'
);

// Section 4
c = c.replace(
  /<section id="ascent"([\s\S]*?)<div className="max-w-5xl mx-auto">\n\s*<div className="text-center space-y-4 mb-16">/,
  '<section id="ascent"$1<div className="max-w-5xl mx-auto">\n          <FadeInSection className="text-center space-y-4 mb-16">'
);
c = c.replace(
  /at each stage\.'\}\n\s*<\/p>\n\s*<\/div>\n\n\s*<div className="space-y-4">/,
  'at each stage.\'}\n            </p>\n          </FadeInSection>\n\n          <StaggerChildren className="space-y-4" staggerDelay={0.06}>'
);
c = c.replace(
  /ascentStages\.map\(\(stg\) => \([\s\S]*?<div\n\s*key=\{stg\.num\}/g,
  'ascentStages.map((stg) => (\n              <motion.div\n                variants={staggerItem}\n                key={stg.num}'
);
c = c.replace(
  /<\/div>\n\s*<\/div>\n\s*\)\)}/g,
  '</div>\n              </motion.div>\n            ))}'
);
c = c.replace(
  /\)\)}\n\s*<\/div>\n\n\s*<p className="text-center/g,
  '))}\n          </StaggerChildren>\n\n          <p className="text-center'
);

// Section 4F
c = c.replace(
  /<section id="case-studies"([\s\S]*?)<div className="max-w-6xl mx-auto">\n\s*<div className="max-w-2xl mb-14">/,
  '<section id="case-studies"$1<div className="max-w-6xl mx-auto">\n          <FadeInSection className="max-w-2xl mb-14">'
);
c = c.replace(
  /independent portfolios\.'\}\n\s*<\/p>\n\s*<\/div>\n\n\s*<div className="grid md:grid-cols-2 gap-6">/,
  'independent portfolios.\'}\n            </p>\n          </FadeInSection>\n\n          <StaggerChildren className="grid md:grid-cols-2 gap-6">'
);
c = c.replace(
  /\}\.map\(\(cs\) => \([\s\S]*?<div key=\{cs\.title\}/g,
  '}.map((cs) => (\n              <motion.div key={cs.title} variants={staggerItem}'
);
c = c.replace(
  /\)\)}\n\s*<\/div>\n\s*<\/div>\n\s*\)\)}/g,
  '))}\n                </div>\n              </motion.div>\n            ))}'
);
c = c.replace(
  /\)\)}\n\s*<\/div>\n\s*<\/div>\n\s*<\/section>\n\n\s*\{\/\* ═══════════════ SECTION 5: LEADERSHIP/g,
  '))}\n          </StaggerChildren>\n        </div>\n      </section>\n\n      {/* ═══════════════ SECTION 5: LEADERSHIP'
);

// Section 5
c = c.replace(
  /<section id="leadership"([\s\S]*?)<div className="max-w-5xl mx-auto text-center space-y-4 mb-14">/,
  '<section id="leadership"$1<FadeInSection className="max-w-5xl mx-auto text-center space-y-4 mb-14">'
);
c = c.replace(
  /Accountable\.\n\s*<\/h2>\n\s*<\/div>\n\n\s*<div className="max-w-5xl mx-auto">\n\s*<div className="grid md:grid-cols-2 gap-6 text-start">/,
  'Accountable.\n          </h2>\n        </FadeInSection>\n\n        <StaggerChildren className="max-w-5xl mx-auto">\n          <div className="grid md:grid-cols-2 gap-6 text-start">'
);
c = c.replace(
  /\{\/\* Islam Mahrous \*\/\}\n\s*<div className="p-8 sm:p-10 border border-white\/10 space-y-6"/,
  '{/* Islam Mahrous */}\n            <motion.div variants={staggerItem} className="p-8 sm:p-10 border border-white/10 space-y-6"'
);
c = c.replace(
  /<\/div>\n\n\s*\{\/\* Chris Nader \*\/\}\n\s*<div className="p-8 sm:p-10 border border-white\/10 space-y-6"/,
  '</motion.div>\n\n            {/* Chris Nader */}\n            <motion.div variants={staggerItem} className="p-8 sm:p-10 border border-white/10 space-y-6"'
);
c = c.replace(
  /\}'\}\n\s*<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/,
  '\'}\n              </p>\n            </motion.div>\n          </div>\n        </StaggerChildren>'
);

// Section 5C
c = c.replace(
  /<section id="values"([\s\S]*?)<div className="max-w-6xl mx-auto">\n\s*<div className="max-w-2xl mb-14">/,
  '<section id="values"$1<div className="max-w-6xl mx-auto">\n          <FadeInSection className="max-w-2xl mb-14">'
);
c = c.replace(
  /when no one is watching\.'\}\n\s*<\/p>\n\s*<\/div>\n\n\s*<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px"/,
  'when no one is watching.\'}\n            </p>\n          </FadeInSection>\n\n          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px"'
);
c = c.replace(
  /\}\.map\(\(v\) => \([\s\S]*?<div key=\{v\.t\}/g,
  '}.map((v) => (\n              <motion.div key={v.t} variants={staggerItem}'
);
c = c.replace(
  /\}\.map\(\(v\) => \([\s\S]*?<motion\.div key=\{v\.t\} variants=\{staggerItem\} className="p-7 hover:bg-white\/\[0\.03\] transition-colors duration-300" style=\{\{ backgroundColor: COLOR\.charcoalDeep \}\}>\n\s*<h4 className="text-sm font-bold uppercase tracking-wide mb-2\.5" style=\{\{ \.\.\.neueHaas, color: COLOR\.copper \}\}>\{v\.t\}<\/h4>\n\s*<p className="text-xs sm:text-sm leading-relaxed text-slate-300" style=\{\{ \.\.\.inter, color: '#94A3B8' \}\}>\{v\.d\}<\/p>\n\s*<\/div>\n\s*\)\)}/,
  '}.map((v) => (\n              <motion.div key={v.t} variants={staggerItem} className="p-7 hover:bg-white/[0.03] transition-colors duration-300" style={{ backgroundColor: COLOR.charcoalDeep }}>\n                <h4 className="text-sm font-bold uppercase tracking-wide mb-2.5" style={{ ...neueHaas, color: COLOR.copper }}>{v.t}</h4>\n                <p className="text-xs sm:text-sm leading-relaxed text-slate-300" style={{ ...inter, color: \'#94A3B8\' }}>{v.d}</p>\n              </motion.div>\n            ))}'
);
c = c.replace(
  /\)\)}\n\s*<\/div>\n\s*<\/div>\n\s*<\/section>\n\n\s*\{\/\* ═══════════════ SECTION 5D/g,
  '))}\n          </StaggerChildren>\n        </div>\n      </section>\n\n      {/* ═══════════════ SECTION 5D'
);

// Section 6
c = c.replace(
  /<div className="relative z-10 max-w-3xl mx-auto space-y-6">/,
  '<FadeInSection className="relative z-10 max-w-3xl mx-auto space-y-6">'
);
c = c.replace(
  /REQUEST A BRIEFING'\}\n\s*<\/Button>\n\s*<\/div>\n\s*<\/div>\n\s*<\/section>\n\n\s*\{\/\* ═══════════════ FOOTER/g,
  'REQUEST A BRIEFING\'}\n            </Button>\n          </div>\n        </FadeInSection>\n      </section>\n\n      {/* ═══════════════ FOOTER'
);

fs.writeFileSync(file, c);
console.log('Patched correctly');
