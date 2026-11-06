import { Link } from 'react-router-dom';
import PigeonMark from '../components/PigeonMark';
import useAppContext from '../useAppContext';
import styles from './Landing.module.css';

const steps = [
  {
    number: '01',
    title: 'Bring your connection',
    description: 'Connect the Postgres database you want to explore, then add an API key from the AI provider you prefer.',
  },
  {
    number: '02',
    title: 'Ask the way you think',
    description: 'Describe the result you need in plain language. No query syntax or dashboard setup required.',
  },
  {
    number: '03',
    title: 'Get an answer you can use',
    description: 'Pigeon sends your question to the configured model and presents the response and returned rows together.',
  },
];

export default function Landing() {
  const { theme } = useAppContext();

  return (
    <div className={`${styles.landingWrapper} ${theme === 'dark' ? styles.dark : ''}`}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo} aria-label="Pigeon home">
          <PigeonMark className={styles.logoMark} />
          <span>Pigeon</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#workflow">How it works</a>
          <a href="#built-for">Built for your workflow</a>
          <Link to="/app" viewTransition className={styles.navBtn}>Open workspace <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span /> A calmer way to explore your data</div>
            <h1 className={styles.heroTitle}>
              Your data has a lot to say.<br />
              <span className={styles.gradientText}>Just ask.</span>
            </h1>
            <p className={styles.heroSub}>
              Pigeon turns everyday questions into a more approachable way to work with PostgreSQL.
              Ask in plain English, get a clear response, and keep the data close.
            </p>
            <div className={styles.heroActions}>
              <Link to="/app" viewTransition className={styles.primaryBtn}>Explore your database <span aria-hidden="true">→</span></Link>
              <a href="#workflow" className={styles.secondaryBtn}>See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <div className={styles.heroNote}><span className={styles.statusDot} /> Open source <i /> Bring your own AI key <i /> Made for PostgreSQL</div>
          </div>

          <div className={styles.previewWrap} aria-label="Preview of a Pigeon database conversation">
            <div className={styles.previewAura} />
            <div className={styles.previewCard}>
              <div className={styles.previewTop}>
                <div className={styles.windowDots}><span /><span /><span /></div>
                <div className={styles.previewPath}><span className={styles.connectionDot} /> analytics / customers</div>
                <span className={styles.previewMore}>···</span>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewGreeting}>
                  <PigeonMark className={styles.previewMark} />
                  <div><strong>Good morning.</strong><span>What would you like to know?</span></div>
                </div>
                <div className={styles.userQuestion}>Which customers have grown the most this quarter?</div>
                <div className={styles.answerBlock}>
                  <div className={styles.answerHeading}><span className={styles.answerMark}>P</span><strong>Here’s the quarter at a glance</strong><span className={styles.answerTime}>just now</span></div>
                  <p>These customers have the largest increase in order value compared with last quarter.</p>
                  <div className={styles.tableFrame}>
                    <table className={styles.fakeTable}>
                      <thead><tr><th>Customer</th><th>Orders</th><th>Change</th></tr></thead>
                      <tbody>
                        <tr><td><span className={styles.customerBadge}>N</span> Northstar Studio</td><td>28</td><td className={styles.growth}>+42.8%</td></tr>
                        <tr><td><span className={`${styles.customerBadge} ${styles.badgeWarm}`}>M</span> Meridian Works</td><td>19</td><td className={styles.growth}>+31.4%</td></tr>
                        <tr><td><span className={`${styles.customerBadge} ${styles.badgeLilac}`}>F</span> Fieldwork Co.</td><td>16</td><td className={styles.growth}>+24.6%</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.queryFoot}><span className={styles.queryIcon}>&lt;/&gt;</span> Results returned <span>·</span> 3 rows</div>
                </div>
                <div className={styles.previewInput}>Ask a follow-up question… <span>↗</span></div>
              </div>
            </div>
            <div className={styles.floatCard}><span className={styles.floatIcon}>↗</span><div><strong>Clarity, without the detour</strong><small>Question in. Useful answer out.</small></div></div>
          </div>
        </section>

        <section id="workflow" className={styles.workflowSection}>
          <div className={styles.sectionIntro}>
            <span className={styles.sectionLabel}>THE FLOW</span>
            <h2>From a question<br />to a clearer picture.</h2>
            <p>No query editor to learn, no dashboard to assemble. Pigeon keeps the useful parts of data work in one focused place.</p>
          </div>
          <div className={styles.steps}>
            {steps.map((step) => (
              <article className={styles.stepCard} key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <div className={styles.stepLine} />
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="built-for" className={styles.detailsSection}>
          <div className={styles.detailsVisual}>
            <div className={styles.schemaCard}>
              <div className={styles.schemaHeader}><span className={styles.schemaGlyph}>⌘</span><div><strong>Your workspace</strong><small>PostgreSQL connection</small></div><span className={styles.liveTag}><i /> READY</span></div>
              <div className={styles.schemaDivider} />
              <div className={styles.schemaRow}><span className={styles.tableGlyph}>▦</span><span>customers</span><span className={styles.schemaCount}>1,284 rows</span></div>
              <div className={styles.schemaRow}><span className={styles.tableGlyph}>▦</span><span>orders</span><span className={styles.schemaCount}>8,642 rows</span></div>
              <div className={styles.schemaRow}><span className={styles.tableGlyph}>▦</span><span>products</span><span className={styles.schemaCount}>392 rows</span></div>
              <div className={styles.schemaQuestion}><span>✳</span> Which products are trending?</div>
              <div className={styles.schemaAnswer}><span>↗</span> A focused answer, with the rows to back it up.</div>
            </div>
            <div className={styles.visualCaption}>A thoughtful interface around your existing tools.</div>
          </div>
          <div className={styles.detailsCopy}>
            <span className={styles.sectionLabel}>MADE TO STAY OUT OF YOUR WAY</span>
            <h2>A small, focused tool.<br /><em>Not another data stack.</em></h2>
            <p>Pigeon brings a React workspace and a lightweight Django API together around the database you already use. Choose a model that supports tool calling, ask a question, and review the response alongside its results.</p>
            <p>Keep your own database and AI settings close at hand, open or tuck away the history and settings panels together, and spend less time translating a question into a query.</p>
            <div className={styles.detailNotes}>
              <div><span>01</span><strong>Your database</strong><small>Connect your PostgreSQL instance</small></div>
              <div><span>02</span><strong>Your AI provider</strong><small>Bring a key from your preferred provider</small></div>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={styles.ctaPattern} />
          <PigeonMark className={styles.ctaMark} />
          <span className={styles.sectionLabel}>A BETTER WAY TO ASK</span>
          <h2>Curiosity is a good<br />place to start.</h2>
          <p>Open your workspace and see what your data can tell you.</p>
          <Link to="/app" viewTransition className={styles.primaryBtn}>Start exploring <span aria-hidden="true">→</span></Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerBrand}><PigeonMark className={styles.footerMark} /> Pigeon</Link>
        <span>A considered little home for your data questions.</span>
        <span>Open source · Built with React &amp; Django</span>
        <span>Icon: <a href="https://icon-sets.iconify.design/streamline-freehand-color/envelope-pigeon/" target="_blank" rel="noreferrer">Envelope Pigeon</a> by Streamline, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></span>
      </footer>
    </div>
  );
}
