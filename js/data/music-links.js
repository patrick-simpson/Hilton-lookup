// External links for grown-ups: the official Awana verse-song albums
// (purchase/streaming only — Awana distributes them via Catapult, not as files)
// and the Bible Biography PDFs downloaded from clubs.awana.org (see README).
// Keyed by book id, then translation id. null = no album published for that combo.

export const MUSIC_LINKS = {
  hg: {
    niv84: 'https://www.catapultdistribution.com/magnet/Awana/HangGlider-Handbook-Music-%2A-NIV',
    esv: 'https://www.catapultdistribution.com/magnet/Awana/HangGlider-Handbook-Music-ESV',
    kjv: 'https://www.catapultdistribution.com/magnet/Awana/HangGlider-Handbook-Music-%2A-KJV',
    nkjv: 'https://www.catapultdistribution.com/magnet/Awana/HangGlider-Handbook-Music-%2A-NKJV',
  },
  wr: {
    niv84: 'https://www.catapultdistribution.com/magnet/Awana/WingRunner-Handbook-Music-%2A-NIV',
    esv: 'https://www.catapultdistribution.com/magnet/Awana/WingRunner-Handbook-Music-ESV',
    kjv: 'https://www.catapultdistribution.com/magnet/Awana/WingRunner-Handbook-Music-%2A-KJV',
    nkjv: 'https://www.catapultdistribution.com/magnet/Awana/WingRunner-Handbook-Music-%2A-NKJV',
  },
  ss: {
    niv84: 'https://www.catapultdistribution.com/magnet/Awana/SkyStormer-Handbook-Music-%2A-NIV',
    esv: 'https://www.catapultdistribution.com/magnet/Awana/Skystormer-Handbook-Music-ESV',
    kjv: 'https://www.catapultdistribution.com/magnet/Awana/SkyStormer-Handbook-Music-%2A-KJV',
    nkjv: 'https://www.catapultdistribution.com/magnet/Awana/SkyStormer-Handbook-Music-%2A-NKJV',
  },
};

export const BIO_PDFS = {
  hg: [
    { title: 'HangGlider Bible Biographies (all)', file: 'docs/resources/hangglider-bible-biographies.pdf' },
  ],
  wr: [
    { title: 'Introduction', file: 'docs/resources/wingrunner-bible-biographies/00-sparks-wingrunner-biographies-introduction.pdf' },
    { title: 'Deborah, A Mother in Israel', file: 'docs/resources/wingrunner-bible-biographies/01-deborah-a-mother-in-israel.pdf' },
    { title: 'Samson, the Strong Judge', file: 'docs/resources/wingrunner-bible-biographies/02-samson-the-strong-judge.pdf' },
    { title: 'Samuel, the Listening Prophet', file: 'docs/resources/wingrunner-bible-biographies/03-samuel-the-listening-prophet.pdf' },
    { title: 'David, The Shepherd King', file: 'docs/resources/wingrunner-bible-biographies/04-david-the-shepherd-king.pdf' },
    { title: 'Solomon, the Wise King', file: 'docs/resources/wingrunner-bible-biographies/05-solomon-the-wise-king.pdf' },
    { title: 'Elijah, the Running Prophet', file: 'docs/resources/wingrunner-bible-biographies/06-elijah-the-running-prophet.pdf' },
    { title: "Josiah, Lover of God's Word", file: 'docs/resources/wingrunner-bible-biographies/07-josiah-lover-of-god-s-word.pdf' },
    { title: 'Daniel, the Praying Prophet', file: 'docs/resources/wingrunner-bible-biographies/08-daniel-the-praying-prophet.pdf' },
    { title: "Nehemiah, God's Workman", file: 'docs/resources/wingrunner-bible-biographies/09-nehemiah-god-s-workman.pdf' },
    { title: "The Priest Who Didn't Believe", file: 'docs/resources/wingrunner-bible-biographies/10-the-priest-who-didn-t-believe.pdf' },
    { title: 'Mary, Handmaiden Who Believed', file: 'docs/resources/wingrunner-bible-biographies/11-mary-handmaiden-who-believed.pdf' },
    { title: 'Shepherds Tell the Good News', file: 'docs/resources/wingrunner-bible-biographies/12-shepherds-tell-the-good-news.pdf' },
  ],
  ss: [
    { title: 'Introduction', file: 'docs/resources/skystormer-bible-biographies/00-skystormer-biographies-introduction.pdf' },
    { title: 'Wise Men', file: 'docs/resources/skystormer-bible-biographies/01-wise-men.pdf' },
    { title: 'The Thankful Leper', file: 'docs/resources/skystormer-bible-biographies/02-thankful-leper.pdf' },
    { title: 'A Child of The King', file: 'docs/resources/skystormer-bible-biographies/03-a-child-of-the-king.pdf' },
    { title: 'Zacchaeus', file: 'docs/resources/skystormer-bible-biographies/04-zacchaeus.pdf' },
    { title: 'A Centurion', file: 'docs/resources/skystormer-bible-biographies/05-a-centurion.pdf' },
    { title: 'Mary Magdalene', file: 'docs/resources/skystormer-bible-biographies/06-marymagdalene.pdf' },
    { title: 'Philip', file: 'docs/resources/skystormer-bible-biographies/07-philip.pdf' },
    { title: 'Tabitha', file: 'docs/resources/skystormer-bible-biographies/08-tabitha.pdf' },
    { title: 'The Church', file: 'docs/resources/skystormer-bible-biographies/09-the-church.pdf' },
    { title: 'A Jailer Finds Joy', file: 'docs/resources/skystormer-bible-biographies/10-a-jailer-find-joy.pdf' },
    { title: 'Paul Strong at Sea', file: 'docs/resources/skystormer-bible-biographies/11-paul-strong-at-sea.pdf' },
    { title: 'Letter from John', file: 'docs/resources/skystormer-bible-biographies/12-letter-from-john.pdf' },
    { title: 'Bio Cards', file: 'docs/resources/skystormer-bible-biographies/13-bio-cards.pdf' },
  ],
};
