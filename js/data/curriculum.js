// Awana Sparks scope and sequence — HangGlider, WingRunner, SkyStormer.
// Source: official Awana Curriculum Scope and Sequence PDFs (awana.org).
// Each section is assigned one of the 20 games; every game appears at least
// once across the three books. `hard: true` marks encore sections that reuse
// a game at a tougher difficulty.

export const BOOKS = [
  {
    id: 'hg',
    name: 'HangGlider',
    grade: 'Kindergarten',
    emoji: '🪂',
    color: 'green',
    blurb: 'Genesis to Joshua — creation, the flood, Moses and the Israelites.',
    sections: [
      {
        id: 'rank', name: 'HangGlider Rank', jewel: 'rank', game: 'disappear',
        entries: [
          { n: 'Rank 1', title: 'S is for Savior', refs: ['1 John 4:14'] },
          { n: 'Rank 2', title: 'Return Flight', refs: ['John 3:16'], review: true },
          { n: 'Rank 3', title: 'P is for Power', refs: ['Psalm 147:5'] },
          { n: 'Rank 4', title: 'A is for Accordance', refs: ['1 Corinthians 15:3'] },
          { n: 'Rank 5', title: 'R is for Raised', refs: ['1 Corinthians 15:4'] },
          { n: 'Rank 6', title: 'K is for Keep', refs: ['James 2:10'] },
          { n: 'Rank 7', title: 'S is for Saved', refs: ['Acts 16:31'] },
          { n: 'Rank 8', title: 'Return Flight', refs: ['1 John 4:14'], review: true },
        ],
      },
      {
        id: 'rj1', name: 'Red Jewel 1', jewel: 'red', game: 'scramble',
        entries: [
          { n: '1:1', title: 'Bring a Friend', refs: [] },
          { n: '1:2', title: 'God Talks to Us Through the Bible', refs: ['John 20:31'] },
          { n: '1:3', title: 'We Talk to God in Prayer', refs: ['Psalm 118:1'] },
          { n: '1:4', title: 'The Bible Tells Us About God', refs: ['1 John 4:19'] },
        ],
      },
      {
        id: 'gj1', name: 'Green Jewel 1', jewel: 'green', game: 'balloon',
        entries: [
          { n: '1:1', title: 'Return Flight', refs: ['Psalm 118:1'], review: true },
          { n: '1:2', title: 'In the Beginning', refs: ['Genesis 1:1'] },
          { n: '1:3', title: 'God Saw It Was Good', refs: ['Genesis 1:31'] },
          { n: '1:4', title: 'Adam and Eve Sin', refs: ['Romans 3:23'] },
        ],
      },
      {
        id: 'rj2', name: 'Red Jewel 2', jewel: 'red', game: 'match',
        entries: [
          { n: '2:1', title: 'Return Flight', refs: ['Genesis 1:1'], review: true },
          { n: '2:2', title: 'Noah and the Flood', refs: ['John 17:17'] },
          { n: '2:3', title: "Noah and God's Promise", refs: ['1 Peter 1:25'] },
          { n: '2:4', title: 'The Tower of Babel', refs: ['John 14:6'] },
        ],
      },
      {
        id: 'gj2', name: 'Green Jewel 2', jewel: 'green', game: 'spinner',
        entries: [
          { n: '2:1', title: 'What Is a Missionary?', refs: [] },
          { n: '2:2', title: 'Where Do Missionaries Work?', refs: [] },
          { n: '2:3', title: 'What Do Missionaries Do?', refs: [] },
          { n: '2:4', title: 'The Bible Tells Us to Pray for Missionaries', refs: ['Colossians 1:3'] },
        ],
      },
      {
        id: 'rj3', name: 'Red Jewel 3', jewel: 'red', game: 'train',
        entries: [
          { n: '3:1', title: 'New Testament Books', refs: [] },
          { n: '3:2', title: 'New Testament Books', refs: ['NT-1'] },
          { n: '3:3', title: 'New Testament Books', refs: ['NT-2'] },
          { n: '3:4', title: 'New Testament Books', refs: ['NT-3'] },
        ],
      },
      {
        id: 'gj3', name: 'Green Jewel 3', jewel: 'green', game: 'stones',
        entries: [
          { n: '3:1', title: 'New Testament Books', refs: ['NT-ALL'], review: true },
          { n: '3:2', title: 'God Saves Baby Moses', refs: ['John 3:14a'] },
          { n: '3:3', title: 'God Helps Moses', refs: ['John 3:14b'] },
          { n: '3:4', title: 'God Saves the Israelites', refs: ['John 3:15'] },
        ],
      },
      {
        id: 'rj4', name: 'Red Jewel 4', jewel: 'red', game: 'firefly',
        entries: [
          { n: '4:1', title: 'The Israelites Complain', refs: ['John 3:16'] },
          { n: '4:2', title: 'Saying John 3:14-16', refs: ['John 3:14-16'] },
          { n: '4:3', title: 'Joshua and Caleb Trust God', refs: ['Joshua 1:9'] },
          { n: '4:4', title: 'Joshua and the Israelites', refs: ['Joshua 24:24'] },
        ],
      },
      {
        id: 'gj4', name: 'Green Jewel 4', jewel: 'green', game: 'stickers',
        entries: [
          { n: '4:1', title: 'Return Flight', refs: ['Joshua 1:9', 'Joshua 24:24'], review: true },
          { n: '4:2', title: 'Obey Your Parents', refs: ['Ephesians 6:1'] },
          { n: '4:3', title: 'Obey Your Parents Chart', refs: [] },
          { n: '4:4', title: 'Return Flight', refs: ['Ephesians 6:1', '1 Corinthians 15:3', 'Romans 3:23'], review: true },
        ],
      },
    ],
  },
  {
    id: 'wr',
    name: 'WingRunner',
    grade: '1st Grade',
    emoji: '🛩️',
    color: 'blue',
    blurb: 'Judges to the birth of Christ — David, Daniel, and Psalm 23.',
    sections: [
      {
        id: 'rank', name: 'WingRunner Rank', jewel: 'rank', game: 'falling',
        entries: [
          { n: 'Rank 1', title: 'John 3:16', refs: ['John 3:16'] },
          { n: 'Rank 2', title: 'S is for Savior and P is for Power', refs: ['1 John 4:14', 'Psalm 147:5'] },
          { n: 'Rank 3', title: 'A is for Accordance and R is for Raised', refs: ['1 Corinthians 15:3', '1 Corinthians 15:4'] },
          { n: 'Rank 4', title: 'K is for Keep and S is for Saved', refs: ['James 2:10', 'Acts 16:31'] },
          { n: 'Rank 5', title: 'Prayer', refs: ['John 20:31', 'Psalm 118:1'] },
          { n: 'Rank 6', title: 'Eternal Life', refs: ['Romans 6:23'] },
          { n: 'Rank 7', title: 'New Testament Books Puzzle', refs: ['NT-ALL'] },
          { n: 'Rank 8', title: 'New Testament Books', refs: ['NT-ALL'], review: true },
        ],
      },
      {
        id: 'rj1', name: 'Red Jewel 1', jewel: 'red', game: 'feed',
        entries: [
          { n: '1:1', title: 'Bring a Friend', refs: [] },
          { n: '1:2', title: 'Deborah: A Mother in Israel', refs: ['Deuteronomy 6:5', 'Psalm 96:2'] },
          { n: '1:3', title: 'Samson: The Strong Judge', refs: ['Jeremiah 32:27', 'Leviticus 19:2'] },
          { n: '1:4', title: 'Samuel: The Listening Prophet', refs: ['Proverbs 20:11'] },
        ],
      },
      {
        id: 'gj1', name: 'Green Jewel 1', jewel: 'green', game: 'karaoke',
        entries: [
          { n: '1:1', title: 'David: The Shepherd King', refs: ['Psalm 23:1', 'Psalm 23:2', 'Psalm 23:3'] },
          { n: '1:2', title: 'Solomon: The Wise King', refs: ['Psalm 23:4', 'Psalm 23:5'] },
          { n: '1:3', title: 'Elijah: The Running Prophet', refs: ['Psalm 23:6', '1 Peter 5:7'] },
          { n: '1:4', title: 'Psalm 23', refs: ['Psalm 23:1', 'Psalm 23:2', 'Psalm 23:3', 'Psalm 23:4', 'Psalm 23:5', 'Psalm 23:6'], review: true },
        ],
      },
      {
        id: 'rj2', name: 'Red Jewel 2', jewel: 'red', game: 'hotpotato',
        entries: [
          { n: '2:1', title: 'A Friend From Far Away', refs: [] },
          { n: '2:2', title: 'A Very Different Sparks Club', refs: [] },
          { n: '2:3', title: 'Not That Different After All', refs: ['Mark 16:15'] },
          { n: '2:4', title: 'Tell Everybody!', refs: [] },
        ],
      },
      {
        id: 'gj2', name: 'Green Jewel 2', jewel: 'green', game: 'refrace',
        entries: [
          { n: '2:1', title: "Josiah: Lover of God's Word", refs: ['1 Peter 1:25'] },
          { n: '2:2', title: 'Daniel: The Praying Prophet', refs: ['1 Thessalonians 5:17-18'] },
          { n: '2:3', title: "Nehemiah: God's Workman", refs: ['Colossians 3:23'] },
          { n: '2:4', title: 'Return Flight', refs: ['Romans 6:23', 'Deuteronomy 6:5', '1 Thessalonians 5:17-18'], review: true },
        ],
      },
      {
        id: 'rj3', name: 'Red Jewel 3', jewel: 'red', game: 'puzzle',
        entries: [
          { n: '3:1', title: 'Facts About the Bible', refs: ['FACTS'] },
          { n: '3:2', title: 'Old Testament Books', refs: ['OT-1'] },
          { n: '3:3', title: 'Old Testament Books', refs: ['OT-2'] },
          { n: '3:4', title: 'Old Testament Books', refs: ['OT-3'] },
        ],
      },
      {
        id: 'gj3', name: 'Green Jewel 3', jewel: 'green', game: 'hopscotch',
        entries: [
          { n: '3:1', title: 'Old Testament Books', refs: ['OT-4'] },
          { n: '3:2', title: 'Old Testament Books', refs: ['OT-5'] },
          { n: '3:3', title: 'Old Testament Books', refs: ['OT-6'] },
          { n: '3:4', title: 'Old Testament Books', refs: ['OT-ALL'], review: true },
        ],
      },
      {
        id: 'rj4', name: 'Red Jewel 4', jewel: 'red', game: 'rocket',
        entries: [
          { n: '4:1', title: "The Priest Who Didn't Believe", refs: ['John 1:1'] },
          { n: '4:2', title: 'Mary: Handmaiden Who Believed', refs: ['John 1:2'] },
          { n: '4:3', title: 'Shepherds Tell the Good News', refs: ['John 1:3'] },
          { n: '4:4', title: 'John 1:1-3', refs: ['John 1:1-3'], review: true },
        ],
      },
      {
        id: 'gj4', name: 'Green Jewel 4', jewel: 'green', game: 'garden',
        entries: [
          { n: '4:1', title: 'Ephesians 4:32', refs: ['Ephesians 4:32'] },
          { n: '4:2', title: 'Philippians 2:14', refs: ['Philippians 2:14'] },
          { n: '4:3', title: 'Good Attitude Rules', refs: [] },
          { n: '4:4', title: 'Return Flight', refs: ['1 Peter 5:7', 'Mark 16:15', 'Colossians 3:23', 'Ephesians 4:32', 'Philippians 2:14'], review: true },
        ],
      },
    ],
  },
  {
    id: 'ss',
    name: 'SkyStormer',
    grade: '2nd Grade',
    emoji: '🚀',
    color: 'red',
    blurb: 'The birth of Christ to Revelation — Jesus, the church, and heaven.',
    sections: [
      {
        id: 'rank', name: 'SkyStormer Rank', jewel: 'rank', game: 'slash',
        entries: [
          { n: 'Rank 1', title: 'John 3:16', refs: ['John 3:16'] },
          { n: 'Rank 2', title: 'S is for Savior and P is for Power', refs: ['1 John 4:14', 'Psalm 147:5'] },
          { n: 'Rank 3', title: 'A is for Accordance and R is for Raised', refs: ['1 Corinthians 15:3-4'] },
          { n: 'Rank 4', title: 'K is for Keep', refs: ['James 2:10'] },
          { n: 'Rank 5', title: 'S is for Saved', refs: ['Acts 16:31'] },
          { n: 'Rank 6', title: "You're Never Alone", refs: ['Deuteronomy 31:8'] },
          { n: 'Rank 7', title: 'Old Testament Books', refs: ['OT-ALL'] },
          { n: 'Rank 8', title: 'New Testament Books', refs: ['NT-ALL'] },
        ],
      },
      {
        id: 'rj1', name: 'Red Jewel 1', jewel: 'red', game: 'relay',
        entries: [
          { n: '1:1', title: 'Bring a Friend', refs: [] },
          { n: '1:2', title: 'Luke 2:10-11', refs: ['Luke 2:10-11'] },
          { n: '1:3', title: 'John 1:1-3', refs: ['John 1:1-3'] },
          { n: '1:4', title: 'Wise Men Worship Their King', refs: ['Isaiah 9:6'] },
        ],
      },
      {
        id: 'gj1', name: 'Green Jewel 1', jewel: 'green', game: 'scramble', hard: true,
        entries: [
          { n: '1:1', title: 'Return Flight', refs: ['Deuteronomy 31:8', 'Luke 2:10-11'], review: true },
          { n: '1:2', title: 'The Thankful Leper', refs: ['Psalm 100:4'] },
          { n: '1:3', title: 'A Child of the King', refs: ['Matthew 19:14'] },
          { n: '1:4', title: 'Zacchaeus Seeks the Savior', refs: ['Luke 19:10'] },
        ],
      },
      {
        id: 'rj2', name: 'Red Jewel 2', jewel: 'red', game: 'balloon', hard: true,
        entries: [
          { n: '2:1', title: 'Return Flight', refs: ['Isaiah 9:6', 'Psalm 100:4', 'Matthew 19:14', 'Luke 19:10'], review: true },
          { n: '2:2', title: 'A Centurion Believes', refs: ['1 John 4:15'] },
          { n: '2:3', title: 'Why Did Jesus Have to Die?', refs: ['Romans 5:8'] },
          { n: '2:4', title: 'Mary Magdalene Sees Her Lord', refs: ['Matthew 28:6', '1 John 5:12'] },
        ],
      },
      {
        id: 'gj2', name: 'Green Jewel 2', jewel: 'green', game: 'refrace', hard: true,
        entries: [
          { n: '2:1', title: 'Meet Your Awana Missionary', refs: [] },
          { n: '2:2', title: 'Missionaries Near and Far', refs: ['Romans 1:16'] },
          { n: '2:3', title: 'Phillip Shares the Good News', refs: ['Acts 1:8'] },
          { n: '2:4', title: 'Return Flight', refs: ['1 John 4:15', 'Romans 5:8', 'Matthew 28:6', '1 John 5:12'], review: true },
        ],
      },
      {
        id: 'rj3', name: 'Red Jewel 3', jewel: 'red', game: 'train', hard: true,
        entries: [
          { n: '3:1', title: 'Tabitha Lives to Serve', refs: ['1 John 3:17-18'] },
          { n: '3:2', title: 'Return Flight', refs: ['OT-ALL'], review: true },
          { n: '3:3', title: 'The Church Prays for Peter', refs: ['Colossians 4:2'] },
          { n: '3:4', title: 'Return Flight', refs: ['OT-ALL'], review: true },
        ],
      },
      {
        id: 'gj3', name: 'Green Jewel 3', jewel: 'green', game: 'disappear', hard: true,
        entries: [
          { n: '3:1', title: 'A Jailer Finds Joy', refs: ['Philippians 4:4'] },
          { n: '3:2', title: 'Paul Stays Strong at Sea', refs: ['2 Corinthians 12:9'] },
          { n: '3:3', title: 'A Lesson From Timothy', refs: ['2 Timothy 3:15'] },
          { n: '3:4', title: 'Return Flight', refs: ['Acts 1:8', '1 John 3:17-18', 'Colossians 4:2', 'Philippians 4:4'], review: true },
        ],
      },
      {
        id: 'rj4', name: 'Red Jewel 4', jewel: 'red', game: 'rocket', hard: true,
        entries: [
          { n: '4:1', title: '1 Thessalonians 4:16', refs: ['1 Thessalonians 4:16'] },
          { n: '4:2', title: '1 Thessalonians 4:17', refs: ['1 Thessalonians 4:17'] },
          { n: '4:3', title: 'A Letter From John', refs: ['Revelation 21:1', 'Revelation 21:3-4'] },
          { n: '4:4', title: 'John 14:1-2', refs: ['John 14:1-2'] },
        ],
      },
      {
        id: 'gj4', name: 'Green Jewel 4', jewel: 'green', game: 'match', hard: true,
        entries: [
          { n: '4:1', title: 'Being a Good Friend', refs: ['Proverbs 17:17'] },
          { n: '4:2', title: 'Being a Good Friend', refs: [] },
          { n: '4:3', title: 'Salvation Verses', refs: ['Romans 3:23', 'Romans 6:23', '1 Corinthians 15:3-4', 'Romans 1:16'], review: true },
          { n: '4:4', title: 'Return Flight', refs: ['2 Corinthians 12:9', '2 Timothy 3:15', '1 Thessalonians 4:16-17', 'John 14:1-2'], review: true },
        ],
      },
    ],
  },
];
