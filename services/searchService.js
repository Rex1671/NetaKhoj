// services/searchService.js
import cacheService from './cacheService.js';

class SearchService {
  constructor() {
    this.searchIndex = new Map();
    this.initialized = false;
    
    // HARDCODED TEST DATA
    this.testData = [
      {
        name: "Narendra Modi",
        type: "MP",
        party: "BJP",
        constituency: "Varanasi",
        state: "Uttar Pradesh",
        gender: "Male",
        age: 73,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Prime_Minister_of_India_Narendra_Modi.jpg/220px-Prime_Minister_of_India_Narendra_Modi.jpg"
      },
      {
        name: "Rahul Gandhi",
        type: "MP",
        party: "INC",
        constituency: "Wayanad",
        state: "Kerala",
        gender: "Male",
        age: 53,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Rahul_Gandhi.jpg/220px-Rahul_Gandhi.jpg"
      },
      {
        name: "Amit Shah",
        type: "MP",
        party: "BJP",
        constituency: "Gandhinagar",
        state: "Gujarat",
        gender: "Male",
        age: 59,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Amit_Shah_official_portrait.jpg/220px-Amit_Shah_official_portrait.jpg"
      },
      {
        name: "Arvind Kejriwal",
        type: "MLA",
        party: "AAP",
        constituency: "New Delhi",
        state: "Delhi",
        gender: "Male",
        age: 55,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Arvind_Kejriwal_2022.jpg/220px-Arvind_Kejriwal_2022.jpg"
      },
      {
        name: "Mamata Banerjee",
        type: "MLA",
        party: "AITC",
        constituency: "Bhabanipur",
        state: "West Bengal",
        gender: "Female",
        age: 69,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Mamata_Banerjee_on_December_2%2C_2020.jpg/220px-Mamata_Banerjee_on_December_2%2C_2020.jpg"
      },
      {
        name: "Yogi Adityanath",
        type: "MLA",
        party: "BJP",
        constituency: "Gorakhpur",
        state: "Uttar Pradesh",
        gender: "Male",
        age: 51,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/CM_Yogi_Adityanath.jpg/220px-CM_Yogi_Adityanath.jpg"
      },
      {
        name: "Priyanka Gandhi",
        type: "MP",
        party: "INC",
        constituency: "Rajya Sabha",
        state: "Uttar Pradesh",
        gender: "Female",
        age: 52,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Priyanka_Gandhi_in_2019.jpg/220px-Priyanka_Gandhi_in_2019.jpg"
      },
      {
        name: "Shashi Tharoor",
        type: "MP",
        party: "INC",
        constituency: "Thiruvananthapuram",
        state: "Kerala",
        gender: "Male",
        age: 67,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Shashi_Tharoor_MP.jpg/220px-Shashi_Tharoor_MP.jpg"
      },
      {
        name: "Nitin Gadkari",
        type: "MP",
        party: "BJP",
        constituency: "Nagpur",
        state: "Maharashtra",
        gender: "Male",
        age: 66,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Nitin_Gadkari.jpg/220px-Nitin_Gadkari.jpg"
      },
      {
        name: "Sonia Gandhi",
        type: "MP",
        party: "INC",
        constituency: "Rajya Sabha",
        state: "Rajasthan",
        gender: "Female",
        age: 77,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Sonia_Gandhi.jpg/220px-Sonia_Gandhi.jpg"
      },
      {
        name: "Akhilesh Yadav",
        type: "MP",
        party: "SP",
        constituency: "Kannauj",
        state: "Uttar Pradesh",
        gender: "Male",
        age: 50,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Akhilesh_Yadav_2016.jpg/220px-Akhilesh_Yadav_2016.jpg"
      },
      {
        name: "Pinarayi Vijayan",
        type: "MLA",
        party: "CPI(M)",
        constituency: "Dharmadam",
        state: "Kerala",
        gender: "Male",
        age: 78,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Pinarayi_Vijayan_2016.jpg/220px-Pinarayi_Vijayan_2016.jpg"
      },
      {
        name: "Uddhav Thackeray",
        type: "MLA",
        party: "Shiv Sena",
        constituency: "Mumbai",
        state: "Maharashtra",
        gender: "Male",
        age: 63,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Uddhav_Thackeray.jpg/220px-Uddhav_Thackeray.jpg"
      },
      {
        name: "Hemant Soren",
        type: "MLA",
        party: "JMM",
        constituency: "Barhait",
        state: "Jharkhand",
        gender: "Male",
        age: 48,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Hemant_Soren.jpg/220px-Hemant_Soren.jpg"
      },
      {
        name: "MK Stalin",
        type: "MLA",
        party: "DMK",
        constituency: "Kolathur",
        state: "Tamil Nadu",
        gender: "Male",
        age: 70,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/M._K._Stalin.jpg/220px-M._K._Stalin.jpg"
      }
    ];
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('🔍 Initializing search index with TEST DATA...');
    
    // Build search index from test data
    this.testData.forEach(member => {
      const key = this.normalizeString(member.name);
      this.searchIndex.set(key, member);
      
      // Also index by party and constituency for better search
      const partyKey = this.normalizeString(member.party);
      const constituencyKey = this.normalizeString(member.constituency);
      
      // Create additional index entries for party/constituency searches
      this.searchIndex.set(`${partyKey}_${key}`, member);
      this.searchIndex.set(`${constituencyKey}_${key}`, member);
    });
    
    this.initialized = true;
    console.log('✅ Search index initialized with', this.testData.length, 'test entries');
  }

  normalizeString(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  }

  async search(query, limit = 3) {
    if (!this.initialized) await this.initialize();
    
    const normalizedQuery = this.normalizeString(query);
    const results = [];
    const seen = new Set();
    
    // Search through test data
    for (const member of this.testData) {
      const nameMatch = this.normalizeString(member.name).includes(normalizedQuery);
      const partyMatch = this.normalizeString(member.party).includes(normalizedQuery);
      const constituencyMatch = this.normalizeString(member.constituency).includes(normalizedQuery);
      const stateMatch = this.normalizeString(member.state).includes(normalizedQuery);
      
      if ((nameMatch || partyMatch || constituencyMatch || stateMatch) && !seen.has(member.name)) {
        results.push({
          ...member,
          relevance: nameMatch ? 10 : (partyMatch ? 5 : 3)
        });
        seen.add(member.name);
      }
    }
    
    // Sort by relevance and name
    results.sort((a, b) => {
      if (a.relevance !== b.relevance) {
        return b.relevance - a.relevance;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Return top results
    return results.slice(0, limit).map(r => {
      const { relevance, ...member } = r;
      return member;
    });
  }

  // For testing: get random members
  getRandomMembers(count = 3) {
    const shuffled = [...this.testData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // For testing: get member by exact name
  getMemberByName(name) {
    return this.testData.find(m => 
      this.normalizeString(m.name) === this.normalizeString(name)
    );
  }
}

export default new SearchService();