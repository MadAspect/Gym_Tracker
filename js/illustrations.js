// ART: stick-figure drawings built from point lists. Each pose: h = head, f = figure lines, e = equipment lines.
// A line is "x,y x,y ..." and lines are separated by ";". The canvas is 160 x 100.
export const POSES = {
  press:{l:"Chest press",h:"60,18",f:"60,26 60,62 82,62 82,88;60,38 76,40 96,38",e:"48,28 48,64 86,64;96,28 96,48"},
  fly:{l:"Fly",h:"60,18",f:"60,26 60,62 82,62 82,88;60,38 78,30 94,40",e:"48,28 48,64 86,64;98,24 92,58"},
  incline:{l:"Incline press",h:"46,30",f:"50,38 64,64 84,64 84,88;52,44 68,40 84,28",e:"40,32 62,68 92,68;84,22 84,40"},
  shoulder:{l:"Shoulder press",h:"60,18",f:"60,26 60,62 82,62 82,88;60,38 72,34 72,12",e:"48,28 48,64 86,64;62,12 84,12"},
  lateral:{l:"Lateral raise",h:"80,16",f:"80,24 80,54 72,88;80,54 88,88;38,34 80,28 122,34",e:"20,92 38,34;140,92 122,34"},
  tricepOH:{l:"Overhead extension",h:"80,18",f:"80,26 80,55 74,88;80,55 86,88;80,30 92,10 78,14",e:"78,14 56,92"},
  pushdown:{l:"Pushdown",h:"80,18",f:"80,26 80,55 74,88;80,55 86,88;80,30 80,48 94,60",e:"94,2 94,60;86,60 102,60"},
  pulldown:{l:"Pulldown",h:"60,18",f:"60,26 60,62 82,62 82,88;60,38 74,28 84,14",e:"48,28 48,64 86,64;72,14 100,14;86,14 86,2"},
  row:{l:"Row",h:"58,18",f:"58,26 58,62 80,62 80,88;58,38 50,50 68,52",e:"46,28 46,64 84,64;68,52 134,52;98,68 98,92"},
  curl:{l:"Preacher curl",h:"56,18",f:"56,26 56,62 78,62 78,88;56,38 70,50 82,36",e:"44,28 44,64 80,64;66,38 84,62"},
  hammer:{l:"Standing curl",h:"80,18",f:"80,26 80,55 74,88;80,55 86,88;80,30 80,48 90,36",e:"90,30 90,42;84,36 96,36"},
  inclineCurl:{l:"Incline curl",h:"46,30",f:"50,38 66,62 86,62 86,88;52,44 56,62 72,52",e:"38,32 60,66 92,66"},
  rearfly:{l:"Rear fly",h:"80,22",f:"80,30 80,60 72,90;80,60 88,90;34,40 80,34 126,40",e:"70,28 70,58;90,28 90,58"},
  legpress:{l:"Leg press",h:"24,54",f:"30,60 52,74 74,56 96,66",e:"20,62 56,82 66,82;98,40 108,90"},
  rdl:{l:"Hip hinge",h:"104,40",f:"96,44 62,56 62,72 62,88;96,46 94,72",e:"82,72 106,72;82,66 82,78;106,66 106,78"},
  quad:{l:"Leg extension",h:"50,22",f:"50,30 50,62 72,62 98,50;50,42 66,54",e:"38,32 38,66 76,66;98,44 98,58"},
  hamcurl:{l:"Leg curl",h:"18,62",f:"26,66 62,66 86,66 78,42",e:"14,72 96,72;74,46 86,38"},
  calf:{l:"Calf raise",h:"80,18",f:"80,26 80,52 82,78 88,86;80,52 78,78 72,86",e:"58,28 102,28;56,4 56,90;104,4 104,90;62,88 98,88"},
  generic:{l:"Dumbbell",f:"",e:"50,50 110,50;44,38 44,62;52,34 52,66;116,38 116,62;108,34 108,66"},
};

// Your original 18 exercises start with a matching pose.
const BUILTIN = {"Machine Chest Press":"press","Pec Dec":"fly","Incline Chest Press":"incline","Machine Shoulder Press":"shoulder",
  "Cable Lateral Raises":"lateral","Overhead Tricep Extensions":"tricepOH","Tricep Pushdown":"pushdown","Lat Pulldown":"pulldown",
  "Cable Rows":"row","Preacher Curls":"curl","Hammer Curls":"hammer","Incline Curls":"inclineCurl","Rear Delt Fly":"rearfly",
  "Leg Press":"legpress","RDLs":"rdl","Quad Extensions":"quad","Hamstring Curls":"hamcurl","Smith Machine Calf Raises":"calf"};

// media = { "Exercise name": { pose?: "press", photo?: "data:image/jpeg;..." } }, stored on the phone.
export const poseOf = (name, media = {}) => media[name]?.pose || BUILTIN[name] || "generic";

export function artHTML(name, media = {}) {
  const m = media[name] || {};
  if (m.photo) return `<img src="${m.photo}" alt="">`;
  const p = POSES[poseOf(name, media)];
  const lines = (s) => s.split(";").filter(Boolean).map((l) => `<polyline points="${l}"/>`).join("");
  const [hx, hy] = (p.h || "").split(",");
  return `<svg viewBox="0 0 160 100" class="fig" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g class="eq" stroke-width="2">${lines(p.e)}</g><g class="bd" stroke-width="3.2">${lines(p.f)}${p.h ? `<circle cx="${hx}" cy="${hy}" r="6.5"/>` : ""}</g></g></svg>`;
}
