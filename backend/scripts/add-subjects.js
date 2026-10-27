import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newSquads = [
  {
    name: 'CBSE Class 12 Boards - Physics & Chemistry Numerical Squad',
    category: 'CBSE & ICSE Boards',
    subject: 'CBSE Class 12 (PCM)',
    description: 'Daily problem solving from NCERT Exemplar, key derivations, and previous 10-year board questions for CBSE Class 12 Board exams.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Mon, Wed, Fri @ 6:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-amber-600 to-rose-900',
    tasks: [
      'Solve 15 NCERT Electrostatics & Current Electricity numericals',
      'Practice Organic Chemistry name reactions and conversions',
      'Timed 45-min previous 5-year CBSE question paper drill',
    ],
  },
  {
    name: 'ICSE Class 10 Board Express - Math & Science',
    category: 'CBSE & ICSE Boards',
    subject: 'ICSE Class 10 (Science & Math)',
    description: 'Thorough syllabus revision for ICSE Class 10 board aspirants. Selina math drills, physics numericals, and biology diagrams.',
    platform: 'Zoom',
    meetingUrl: 'https://zoom.us/join',
    schedule: 'Tue, Thu, Sat @ 5:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-indigo-600 to-sky-900',
    tasks: [
      'Review ICSE Coordinate Geometry & Quadratic Equations',
      'Practice Physics light refraction ray diagrams & lens formula',
      'Revise Chemistry Periodic Table & Metallurgy trends',
    ],
  },
  {
    name: 'Matric & State Board 10th/12th Math Mastery',
    category: 'State Board / Matric',
    subject: 'State Board / Matriculation',
    description: 'High-scoring revision for Tamil Nadu & State Board Matriculation students. Step-by-step 5-mark theorem solutions & blueprint mastery.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Mon to Fri @ 7:00 PM IST',
    maxMembers: 8,
    bannerGradient: 'from-emerald-600 to-teal-900',
    tasks: [
      'Master Matrices, Vector Algebra & Probability 5-mark proofs',
      'Revise State Board blueprint high-weightage chapters',
      'Weekly mock model question paper test drill',
    ],
  },
  {
    name: 'TN State Board 12th Physics & Chemistry: Public Exam Mastery',
    category: 'State Board / Matric',
    subject: 'State Board 12th Physics & Chemistry',
    description: 'Targeting 95+ in TN State Board & Matriculation Exams. 5-mark derivations, ray optics, electromagnetic induction, organic reactions, and electrochemistry.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Mon, Wed, Fri @ 6:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-amber-600 to-emerald-900',
    tasks: [
      'Derive Cyclotron frequency, Transformer losses & Snell Law proofs',
      'Revise Organic Named Reactions (Kolbe, Cannizzaro, Sandmeyer, Aldol)',
      'Timed 45-min Book-Back & PTA model question paper drill',
    ],
  },
  {
    name: 'State Board & Matric 10th SSLC: Maths & Science Centum Club',
    category: 'State Board / Matric',
    subject: 'State Board / Matric 10th (SSLC)',
    description: 'Targeting Centum (100/100) in 10th SSLC Board Exams. Practical geometry, coordinate geometry, trigonometry, physics laws, and life sciences.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Daily @ 6:00 PM IST',
    maxMembers: 8,
    bannerGradient: 'from-teal-600 to-blue-900',
    tasks: [
      'Practice Practical Geometry (Tangents & Triangles) and Graph drawing',
      'Solve 10 Trigonometric identities & Heights and Distances problems',
      'Revise Periodic Table, Chemical Bonding & Human anatomy diagrams',
    ],
  },
  {
    name: 'Matriculation 12th Biology & Computer Science Board Prep',
    category: 'State Board / Matric',
    subject: 'State Board / Matric 12th',
    description: 'High-yield revision for Tamil Nadu & State Matriculation board: Botany genetics, Zoology physiology, Python programming, and SQL database queries.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Tue, Thu, Sat @ 7:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-emerald-600 to-indigo-900',
    tasks: [
      'Revise Genetics & Biotechnology Mendelian dihybrid crosses',
      'Write Python functions for text file handling & SQL database connection',
      'Practice Previous 5 Years State Board Public Exam Question Papers',
    ],
  },
  {
    name: 'Core Engineering: OS, DBMS & Computer Networks',
    category: 'Engineering & Tech',
    subject: 'Computer Science & Engineering',
    description: 'College engineering semester prep covering CPU scheduling, virtual memory, SQL indexing, deadlock avoidance, and TCP/IP protocol stack.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Tue, Thu, Sun @ 8:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-blue-600 to-cyan-900',
    tasks: [
      'Review Semaphores, Banker\'s Algorithm & Deadlocks',
      'Simulate TCP sliding window & subnetting IP calculations',
      'Discuss semester university past exam question papers',
    ],
  },
  {
    name: 'ECE & EEE: Digital Electronics & Signals and Systems',
    category: 'Engineering & Tech',
    subject: 'Electrical & Electronics Engineering',
    description: 'Deep-dive into K-maps, sequential flip-flops, Laplace / Fourier / Z-transforms, and AC circuit theorems for engineering undergrads.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Mon & Wed @ 8:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-violet-600 to-purple-900',
    tasks: [
      'Solve 10 Laplace and Z-transform conversion problems',
      'Design synchronous MOD-8 counter and state machine diagram',
      'Analyze Thévenin and Norton equivalent AC circuits',
    ],
  },
  {
    name: 'Mechanical & Civil: Mechanics & Thermodynamics',
    category: 'Engineering & Tech',
    subject: 'Mechanical & Civil Engineering',
    description: 'Collaborative problem solving on Free-Body Diagrams, Mohr circles, Rankine / Carnot cycles, SFD/BMD beams, and fluid mechanics.',
    platform: 'Zoom',
    meetingUrl: 'https://zoom.us/join',
    schedule: 'Weekends @ 11:00 AM IST',
    maxMembers: 6,
    bannerGradient: 'from-orange-600 to-red-900',
    tasks: [
      'Derive Otto & Diesel cycle thermal efficiency formulas',
      'Calculate Bending Moment & Shear Force diagrams for beams',
      'Review Fluid Dynamics Bernoulli equation numericals',
    ],
  },
  {
    name: 'Arts & Humanities: Literature, History & Political Science',
    category: 'Arts & Humanities',
    subject: 'Arts & Humanities (BA / MA)',
    description: 'Critical discussion circle for English literature analysis, political philosophy (Plato to Rawls), sociology theories, and historical essays.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Every Saturday @ 4:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-pink-600 to-rose-900',
    tasks: [
      'Draft comparative analysis on post-colonial literature themes',
      'Review constitutional democracy concepts and key legal precedents',
      'Exchange peer review on weekly essay submissions',
    ],
  },
  {
    name: 'Commerce & CA Foundation: Accounting & Business Economics',
    category: 'Commerce & Business',
    subject: 'Commerce & CA Foundation',
    description: 'Concept clearing for Financial Accounting, Partnership accounts, Company Law, Microeconomics, and CA Foundation quantitative aptitude.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Daily @ 6:30 PM IST',
    maxMembers: 8,
    bannerGradient: 'from-teal-600 to-emerald-900',
    tasks: [
      'Solve Cash Flow Statement & Consignment journal entries',
      'Review Law of Diminishing Marginal Utility & Elasticity curves',
      'CA Foundation 50-question mock speed drill test',
    ],
  },
  {
    name: 'CBSE 12th Physics: Derivations & Numericals Mastery',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th Physics',
    description: 'Targeting 95+ in CBSE Class 12 Physics. Deep focus on NCERT derivations, Gauss Law, Lens Maker formula, Wave Optics, and numerical problem solving.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Mon, Wed, Fri @ 7:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-amber-600 to-rose-900',
    tasks: [
      'Derive Lens Maker formula & prism refractive index formula',
      'Solve 15 NCERT Electrostatics & Current Electricity numericals',
      'Timed 1-hour previous 5-year CBSE board question paper drill',
    ],
  },
  {
    name: 'CBSE 12th Chemistry: Organic Reactions & NCERT Numericals',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th Chemistry',
    description: 'Master organic name reactions (Aldol, Cannizzaro, Reimer-Tiemann), coordination compounds, and Nernst equation / kinetics numericals for Class 12.',
    platform: 'Zoom',
    meetingUrl: 'https://zoom.us/join',
    schedule: 'Tue, Thu, Sat @ 6:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-rose-600 to-purple-900',
    tasks: [
      'Practice 10 organic conversion roadmaps and named reactions',
      'Solve Nernst equation and First-Order Kinetics half-life numericals',
      'Revise d-block transition metal properties & coordination IUPAC naming',
    ],
  },
  {
    name: 'CBSE 12th Mathematics: Calculus & 3D Vectors Sprint',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th Mathematics',
    description: 'High-intensity math prep: Integration by parts, partial fractions, differential equations, shortest distance between skew lines, and Bayes theorem.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Daily @ 8:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-blue-600 to-indigo-900',
    tasks: [
      'Solve 20 Integration by Parts & Definite Integrals properties questions',
      'Practice 3D Geometry: Shortest distance between skew lines & plane equations',
      'Master Bayes Theorem 5-mark probability word problems',
    ],
  },
  {
    name: 'CBSE 12th Biology: NCERT Genetics & Biotech (PCB/NEET)',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th Biology',
    description: 'Deep-dive NCERT line-by-line revision: Molecular Basis of Inheritance, Mendelian Genetics, Recombinant DNA technology, and Ecology diagrams.',
    platform: 'Zoom',
    meetingUrl: 'https://zoom.us/join',
    schedule: 'Mon, Wed, Fri @ 5:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-emerald-600 to-teal-900',
    tasks: [
      'Draw and label DNA replication fork & lac operon mechanism',
      'Solve pedigree analysis and dihybrid cross genetics numericals',
      'Review PCR steps and restriction endonuclease diagrams',
    ],
  },
  {
    name: 'CBSE 12th Computer Science: Python & SQL Board Express',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th Computer Science',
    description: 'Comprehensive CBSE CS board syllabus prep: Python text/binary/CSV file handling, Stack push/pop functions, and MySQL queries with joins & grouping.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Tue, Thu, Sun @ 7:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-cyan-600 to-blue-900',
    tasks: [
      'Write Python functions for Binary file pickle dump/load & CSV reader',
      'Implement Stack operations (Push & Pop) using Python list',
      'Practice 10 CBSE SQL queries with GROUP BY, HAVING, and INNER JOIN',
    ],
  },
  {
    name: 'CBSE 12th English Core: Flamingo & Advanced Writing Skills',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th English Core',
    description: 'Scoring 95+ in CBSE English Core: Literary analysis of Flamingo poems/prose, Vistas chapters, Notice writing, Letters to Editor & Job Applications.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Every Saturday & Sunday @ 3:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-violet-600 to-pink-900',
    tasks: [
      'Draft formal Job Application with Bio-Data / Resume format',
      'Analyze theme and poetic devices in "A Thing of Beauty" & "Keeping Quiet"',
      'Practice unseen passage comprehension speed run',
    ],
  },
  {
    name: 'CBSE 12th Commerce: Accountancy & Macroeconomics',
    category: 'CBSE 12th Boards',
    subject: 'CBSE 12th Commerce',
    description: 'Comprehensive prep for CBSE 12th Commerce: Partnership reconstitution, Forfeiture & Re-issue of Shares, Cash Flow Statement, and National Income calculation.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Daily @ 6:00 PM IST',
    maxMembers: 8,
    bannerGradient: 'from-amber-600 to-orange-900',
    tasks: [
      'Solve comprehensive problem on Forfeiture and Re-issue of Shares',
      'Prepare Cash Flow Statement operating activities with adjustments',
      'Calculate National Income using Value Added & Expenditure methods',
    ],
  },
  {
    name: 'Java Full-Stack & OOPs Architecture Squad',
    category: 'Java Programming',
    subject: 'Java, OOPs & Spring Boot',
    description: 'College semester & placement prep: Core Java, OOPs design patterns, Java Collections Framework (ArrayList, HashMap, PriorityQueue), multithreading, and Spring Boot REST APIs.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Mon, Wed, Fri @ 8:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-amber-700 to-red-900',
    tasks: [
      'Implement custom Generic Linked List & Binary Search Tree in Java',
      'Practice Java 8 Streams API filter/map/reduce operations',
      'Build and test Spring Boot REST controller with JPA Hibernate',
    ],
  },
  {
    name: 'Python Core & Data Science Sprint',
    category: 'Python & Data Science',
    subject: 'Python, NumPy & Pandas',
    description: 'Master Python for software engineering & data analysis: OOP in Python, list/dict comprehensions, NumPy vectorization, Pandas DataFrame manipulation, and Matplotlib data visualization.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Tue, Thu, Sat @ 7:00 PM IST',
    maxMembers: 8,
    bannerGradient: 'from-blue-600 to-yellow-800',
    tasks: [
      'Solve 15 Python coding challenges (generators, decorators, lambda)',
      'Clean, filter, and aggregate multi-dimensional data using Pandas',
      'Build exploratory data analysis (EDA) notebook with Seaborn plots',
    ],
  },
  {
    name: 'Artificial Intelligence & Neural Networks Lab',
    category: 'Artificial Intelligence',
    subject: 'AI, Machine Learning & PyTorch',
    description: 'College AI course & project squad: Supervised/Unsupervised learning, gradient descent, building Multi-Layer Perceptrons (MLPs), CNNs for image classification, and PyTorch model training.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Mon, Wed, Sat @ 6:30 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-indigo-600 to-purple-900',
    tasks: [
      'Implement Gradient Descent & Backpropagation from scratch in Python',
      'Train a Convolutional Neural Network (CNN) on CIFAR-10 with PyTorch',
      'Evaluate classification metrics: Precision, Recall, F1-Score, ROC-AUC',
    ],
  },
  {
    name: 'Applied Generative AI & LLM Systems Squad',
    category: 'Artificial Intelligence',
    subject: 'Generative AI & LLM Engineering',
    description: 'Building modern AI applications: Prompt engineering, Retrieval-Augmented Generation (RAG) with LangChain / LlamaIndex, Vector Databases (Pinecone/Chroma), and fine-tuning.',
    platform: 'Discord',
    meetingUrl: 'https://discord.com',
    schedule: 'Weekends @ 4:00 PM IST',
    maxMembers: 6,
    bannerGradient: 'from-emerald-600 to-cyan-900',
    tasks: [
      'Build an end-to-end RAG pipeline using ChromaDB & LangChain',
      'Implement conversational agent with function calling tools',
      'Benchmark retrieval accuracy and latency across vector embeddings',
    ],
  },
  {
    name: 'Campus Placement DSA Bootcamp (Java & Python)',
    category: 'Competitive Coding',
    subject: 'Data Structures & Algorithms',
    description: 'Intensive campus placement prep: Graph algorithms (Dijkstra, Topological Sort), Dynamic Programming memoization/tabulation, Trees, and Trie implementations in Java & Python.',
    platform: 'Google Meet',
    meetingUrl: 'https://meet.google.com/new',
    schedule: 'Daily @ 9:00 PM IST',
    maxMembers: 8,
    bannerGradient: 'from-teal-600 to-indigo-900',
    tasks: [
      'Solve 2 LeetCode Medium/Hard DP problems (Knapsack, LCS)',
      'Implement Dijkstra algorithm using PriorityQueue in Java',
      'Mock technical coding interview with squad partner (timed 45 min)',
    ],
  },
];

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database to own squads!');
    process.exit(1);
  }

  console.log(`Using owner: ${user.name} (${user.id})`);

  let addedCount = 0;
  for (const sq of newSquads) {
    const existing = await prisma.squad.findFirst({
      where: { name: sq.name },
    });

    if (!existing) {
      const { tasks, ...squadData } = sq;
      const created = await prisma.squad.create({
        data: {
          ...squadData,
          ownerId: user.id,
        },
      });

      for (const t of tasks) {
        await prisma.task.create({
          data: {
            squadId: created.id,
            createdById: user.id,
            text: t,
            completed: false,
          },
        });
      }
      console.log(`✅ Added squad: "${sq.name}" (${sq.category})`);
      addedCount++;
    } else {
      // Check if tasks exist
      const taskCount = await prisma.task.count({ where: { squadId: existing.id } });
      if (taskCount === 0) {
        for (const t of sq.tasks) {
          await prisma.task.create({
            data: {
              squadId: existing.id,
              createdById: user.id,
              text: t,
              completed: false,
            },
          });
        }
        console.log(`Updated tasks for existing squad: "${sq.name}"`);
      } else {
        console.log(`Squad already exists: "${sq.name}"`);
      }
    }
  }

  console.log(`🎉 Done! Added ${addedCount} new school & college study squads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
