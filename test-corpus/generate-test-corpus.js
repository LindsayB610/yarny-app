#!/usr/bin/env node

/**
 * Script to generate test corpus content for test-medium and test-large
 * This creates sample text files that can be uploaded to Google Drive
 */

const fs = require('fs');
const path = require('path');

// Sample content templates
const SAMPLE_PARAGRAPHS = [
  "The morning sun cast long shadows across the cobblestone streets, painting the ancient city in hues of gold and amber. Merchants were already setting up their stalls, their voices creating a symphony of commerce that echoed through the narrow alleys.",
  "In the depths of the library, where dust motes danced in shafts of filtered light, Aria discovered the tome that would change everything. Its pages were brittle with age, but the words within still held power.",
  "The battle raged on the plains below, where Marcus stood firm against the advancing horde. His sword gleamed in the sunlight, each swing a testament to years of training and unwavering resolve.",
  "Luna felt the magic coursing through her veins as she channeled the ancient energies. The symbols she traced in the air glowed with an otherworldly light, connecting her to forces beyond mortal comprehension.",
  "Thorne moved through the shadows like a ghost, his footsteps silent on the worn stone. The information he sought was here, hidden in the darkest corners of the city where few dared to venture.",
  "Elara's hands moved with practiced precision, mixing herbs and potions that could heal the gravest wounds. The healing sanctum was her sanctuary, a place where pain met its match in her gentle touch.",
  "The forge rang with the sound of hammer on metal as Kael worked his craft. Sparks flew like stars, and with each strike, raw iron was transformed into something greater, something that would serve and protect.",
  "Zara's ledger told stories of a thousand transactions, each entry a thread in the vast tapestry of commerce. Her merchant's quarter was a hub of activity, where fortunes were made and lost with the turn of a coin.",
  "Orin stood watch on the city walls, his eyes scanning the horizon for any sign of danger. The guard's duty was sacred, a promise to protect those who slept peacefully within the city's embrace.",
  "Nyx existed in the spaces between light and shadow, a figure known only by reputation. The underground tunnels were her domain, where secrets flowed like water and information was the only currency that mattered."
];

function generateSnippetContent(chapterNum, snippetNum, totalSnippets) {
  const baseParagraph = SAMPLE_PARAGRAPHS[(chapterNum - 1) % SAMPLE_PARAGRAPHS.length];
  const variation = snippetNum % 3;
  
  let content = baseParagraph;
  
  // Add variation to make each snippet unique
  if (variation === 0) {
    content += `\n\nThis was the moment that would define everything. The choices made here would ripple through time, affecting lives yet to be lived and stories yet to be told.`;
  } else if (variation === 1) {
    content += `\n\nAs the day wore on, new challenges emerged. Each obstacle seemed insurmountable, yet somehow, through determination and will, they would find a way forward.`;
  } else {
    content += `\n\nThe past and future collided in this singular moment. What had been and what would be were both present, creating a tapestry of possibility that stretched beyond the horizon.`;
  }
  
  // Add more content for larger snippets (to reach word count targets)
  if (totalSnippets > 50) {
    content += `\n\nThe weight of responsibility settled on their shoulders like a familiar cloak. It was heavy, yes, but it was also theirs to bear, and they would carry it with honor and purpose.`;
  }
  
  return content;
}

function generateNoteContent(type, index) {
  const templates = {
    people: [
      "Aria is a scholar with an insatiable curiosity about ancient texts and forgotten languages. She spends most of her time in the Grand Library, where she has discovered several important historical documents.",
      "Marcus is a seasoned warrior who has fought in countless battles. He is known for his unwavering loyalty and his ability to inspire courage in others, even in the darkest of times.",
      "Luna is a mystic who can channel ancient magical energies. Her connection to the mystical realm gives her insights that others cannot perceive, but it also comes with a great burden.",
      "Thorne is a rogue who operates in the shadows, gathering information and completing tasks that others cannot. His skills in stealth and deception are unmatched, but he has a code of honor that guides his actions.",
      "Elara is a healer whose compassion knows no bounds. She has dedicated her life to helping others, using both traditional medicine and mystical healing techniques to save lives.",
      "Kael is a master smith whose craftsmanship is legendary. His weapons and armor are sought after by warriors throughout the land, and his forge is always busy with new projects.",
      "Zara is a merchant who has built a trading empire through shrewd business deals and an extensive network of contacts. She knows the value of information and is always looking for the next opportunity.",
      "Orin is a guard who takes his duty to protect the city very seriously. He is vigilant, disciplined, and always ready to defend those under his protection, no matter the cost.",
      "Nyx is a shadow operative who moves through the underground world with ease. Her true identity is unknown to most, but her reputation for getting things done is well-established.",
      "Sage is an ancient being who has witnessed countless ages pass. Their wisdom is vast, but they speak in riddles and metaphors that require careful interpretation."
    ],
    places: [
      "The Grand Library is a vast repository of knowledge, with shelves that stretch into the darkness above. It contains texts from every era, some so old that their origins are lost to time.",
      "The Warrior's Keep is a fortress built on a hill overlooking the city. Its walls are thick and its defenses are formidable, making it a symbol of strength and protection for all who live nearby.",
      "The Mystic Grove is a sacred place where the boundary between the mortal and mystical realms is thin. Those who enter often experience visions and hear whispers from other worlds.",
      "The Shadow Market operates in the hidden corners of the city, where goods and services of questionable legality are traded. It is a place where information flows freely and deals are made in whispers.",
      "The Healing Sanctum is a place of peace and restoration, where the wounded come to be healed. The air itself seems to have healing properties, and the healers who work here are highly skilled.",
      "The Forge District is a noisy, bustling area where the city's metalworkers ply their trade. The constant sound of hammers and the glow of forges create an atmosphere of industry and creation.",
      "The Merchant Quarter is the commercial heart of the city, where traders from all over the world come to buy and sell. The streets are always busy, and the air is filled with the sounds of commerce.",
      "The City Walls are ancient structures that have protected the city for generations. They bear the scars of countless battles but still stand strong, a testament to the resilience of those who built them.",
      "The Underground Tunnels form a labyrinth beneath the city, used by those who need to move unseen. Some say they were built by an ancient civilization, while others believe they are natural formations.",
      "The Ancient Ruins are the remains of a civilization that existed long before the current city. They are shrouded in mystery, and many believe they hold secrets and treasures waiting to be discovered."
    ],
    things: [
      "The Crystal of Power is an artifact of immense magical energy. It has been sought after by mystics and scholars for centuries, but its true purpose and origin remain unknown.",
      "The Warrior's Blade is a legendary sword that has been passed down through generations of warriors. It is said to be unbreakable and to grant its wielder enhanced strength and courage.",
      "The Mystic Orb is a sphere of pure magical energy that can be used to channel and focus mystical powers. It glows with an inner light that pulses in rhythm with the magical currents of the world.",
      "The Shadow Cloak is a garment that allows its wearer to blend into shadows and move undetected. It is highly prized by rogues and spies, but few know how to properly use its abilities.",
      "The Healing Potion is a rare concoction that can heal even the most grievous wounds. It is difficult to create and requires rare ingredients, making it extremely valuable.",
      "The Forge Hammer is a tool of exceptional quality, used by master smiths to create weapons and armor of legendary status. It has been used to forge many of the greatest weapons in history.",
      "The Merchant's Ledger contains records of every transaction made in the merchant quarter for the past century. It is a valuable source of information for those who know how to read it.",
      "The Guard's Shield is a symbol of protection and duty. It has been used to defend the city in countless battles and bears the marks of many conflicts, each one a story of courage and sacrifice.",
      "The Ancient Scroll contains knowledge from a lost civilization. Its text is written in a language that few can read, but those who can understand it gain access to powerful secrets.",
      "The Timekeeper's Watch is a mysterious device that seems to measure time in ways that normal clocks cannot. Some say it can see into the past and future, but its true nature remains a mystery."
    ]
  };
  
  const list = templates[type] || templates.people;
  return list[index % list.length];
}

function generateTestMedium() {
  const baseDir = path.join(__dirname, 'test-medium');
  const chaptersDir = path.join(baseDir, 'chapters');
  
  // Generate chapter directories and snippet files
  for (let chapterNum = 1; chapterNum <= 10; chapterNum++) {
    const chapterDir = path.join(chaptersDir, `chapter-${chapterNum}`);
    fs.mkdirSync(chapterDir, { recursive: true });
    
    // Generate 8 snippets per chapter
    for (let snippetNum = 1; snippetNum <= 8; snippetNum++) {
      const content = generateSnippetContent(chapterNum, snippetNum, 80);
      const filename = `snippet-${chapterNum}-${snippetNum}.txt`;
      fs.writeFileSync(path.join(chapterDir, filename), content, 'utf8');
    }
  }
  
  // Generate People notes
  const peopleDir = path.join(baseDir, 'people');
  for (let i = 1; i <= 10; i++) {
    const content = generateNoteContent('people', i - 1);
    fs.writeFileSync(path.join(peopleDir, `person-${i}.txt`), content, 'utf8');
  }
  
  // Generate Places notes
  const placesDir = path.join(baseDir, 'places');
  for (let i = 1; i <= 10; i++) {
    const content = generateNoteContent('places', i - 1);
    fs.writeFileSync(path.join(placesDir, `place-${i}.txt`), content, 'utf8');
  }
  
  // Generate Things notes
  const thingsDir = path.join(baseDir, 'things');
  for (let i = 1; i <= 10; i++) {
    const content = generateNoteContent('things', i - 1);
    fs.writeFileSync(path.join(thingsDir, `thing-${i}.txt`), content, 'utf8');
  }
  
  console.log('✓ Generated test-medium corpus');
}

function generateTestLarge() {
  const baseDir = path.join(__dirname, 'test-large');
  const chaptersDir = path.join(baseDir, 'chapters');
  
  // Generate chapter directories and snippet files
  for (let chapterNum = 1; chapterNum <= 25; chapterNum++) {
    const chapterDir = path.join(chaptersDir, `chapter-${chapterNum}`);
    fs.mkdirSync(chapterDir, { recursive: true });
    
    // Chapter 13 is the very large chapter with 50+ snippets
    const snippetCount = chapterNum === 13 ? 55 : 15;
    
    for (let snippetNum = 1; snippetNum <= snippetCount; snippetNum++) {
      const content = generateSnippetContent(chapterNum, snippetNum, 375);
      const filename = `snippet-${chapterNum}-${snippetNum}.txt`;
      fs.writeFileSync(path.join(chapterDir, filename), content, 'utf8');
    }
  }
  
  // Generate People notes
  const peopleDir = path.join(baseDir, 'people');
  for (let i = 1; i <= 25; i++) {
    const content = generateNoteContent('people', (i - 1) % 10);
    fs.writeFileSync(path.join(peopleDir, `person-${i}.txt`), content, 'utf8');
  }
  
  // Generate Places notes
  const placesDir = path.join(baseDir, 'places');
  for (let i = 1; i <= 25; i++) {
    const content = generateNoteContent('places', (i - 1) % 10);
    fs.writeFileSync(path.join(placesDir, `place-${i}.txt`), content, 'utf8');
  }
  
  // Generate Things notes
  const thingsDir = path.join(baseDir, 'things');
  for (let i = 1; i <= 25; i++) {
    const content = generateNoteContent('things', (i - 1) % 10);
    fs.writeFileSync(path.join(thingsDir, `thing-${i}.txt`), content, 'utf8');
  }
  
  console.log('✓ Generated test-large corpus');
}

// Main execution
console.log('Generating test corpus files...\n');
generateTestMedium();
generateTestLarge();
console.log('\n✓ Test corpus generation complete!');
console.log('\nNext steps:');
console.log('1. Upload these files to Google Drive in the "Yarny Test Corpus" folder');
console.log('2. Update metadata.json files with actual Drive folder IDs');
console.log('3. Share the folder with the engineering team');


