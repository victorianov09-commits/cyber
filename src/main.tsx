import React from 'react'
import ReactDOM from 'react-dom/client'
import { ArrowUpRight, ArrowRight, Shield, House, BookOpen, Flag, Network, KeyRound, ScanLine, Database, Layers, ChevronRight, LockKeyhole, Check, Menu, X } from 'lucide-react'
import './style.css'

type Page = 'home' | 'missions' | 'academy' | 'about'
const missions = [
  { title: '네트워크와 방화벽', description: '네트워크의 흐름을 이해하고, 안전한 연결을 지켜보세요.', icon: Network, tag: 'NETWORK' },
  { title: '계정과 비밀번호 보안', description: '안전한 비밀번호와 계정 보호의 기본을 배워보세요.', icon: KeyRound, tag: 'ACCOUNT' },
  { title: '로그인 로그 이상 탐지', description: '로그 속 단서를 찾아 의심스러운 접속을 구별해 보세요.', icon: ScanLine, tag: 'DETECTION' },
  { title: 'SQL 인젝션 모의 실험', description: '모의 환경에서 입력값과 데이터 보호를 이해해 보세요.', icon: Database, tag: 'SIMULATION' },
  { title: '복합 보안 사고 대응', description: '배운 지식을 연결해 보안 사고에 대응해 보세요.', icon: Layers, tag: 'RESPONSE' },
]
const pageFromHash = (): Page => {
  const value = window.location.hash.slice(2)
  return ['missions', 'academy', 'about'].includes(value) ? value as Page : 'home'
}
function App() {
  const [page, setPage] = React.useState<Page>(pageFromHash)
  const [menuOpen, setMenuOpen] = React.useState(false)
  React.useEffect(() => {
    const update = () => { setPage(pageFromHash()); setMenuOpen(false); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const nav = [{ id: 'home', name: '대시보드', icon: House }, { id: 'missions', name: '게임 시작하기', icon: Flag }, { id: 'academy', name: '보안 아카데미', icon: BookOpen }, { id: 'about', name: '프로젝트 소개', icon: Shield }]
  return <div className="app">
    <a className="skip" href="#content">본문으로 바로가기</a>
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <a className="brand" href="#/"><span className="brand-icon"><Shield size={24}/></span><span>CYBER DUEL<small>SECURITY LEARNING PLATFORM</small></span></a>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="주 메뉴">{nav.map(({ id, name, icon: Icon }) => <a href={id === 'home' ? '#/' : `#/${id}`} key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined}><Icon size={18}/>{name}{page === id && <span className="nav-dot"/>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="learn-note"><div className="note-icon"><Shield size={19}/><span>작은 배움, 더 안전한 내일</span></div><p>보안을 이해하는 첫걸음.<br/>여기서 함께 시작해요.</p></div><div className="version"><span className="status-dot"/>LEARNING MODE<span>v0.1</span></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button><span>워크스페이스</span><ChevronRight size={14}/><strong>{nav.find(n => n.id === page)?.name}</strong></div><div className="header-right"><span className="environment"><span className="status-dot"/>안전한 학습 공간</span><span className="avatar">CD</span></div></header>
    <main id="content">
      {page === 'home' ? <>
        <div className="page-heading"><div><div className="eyebrow">YOUR SECURITY JOURNEY STARTS HERE</div><h1>반가워요, 미래의 보안 전문가님<span className="mint">.</span></h1><p>어려운 보안 개념도, 직접 경험하면 쉬워집니다.</p></div><span className="outline-badge"><span className="status-dot"/>입문자를 위한 보안 학습</span></div>
        <section className="hero"><div className="hero-copy"><div className="hero-label"><span/>PLAY. LEARN. PROTECT.</div><h2>CYBER DUEL</h2><p className="hero-subtitle">당신의 선택이, 더 안전한 세상을 만듭니다.</p><p className="hero-description">가상의 보안 상황에서 직접 판단하고 문제를 해결해 보세요.<br/>게임으로 시작하는 나의 첫 사이버보안 수업.</p><div className="hero-actions"><a className="button primary" href="#/missions">게임 시작하기<ArrowRight size={18}/></a><a className="button secondary" href="#/academy"><BookOpen size={17}/>보안 아카데미</a></div><div className="hero-meta"><span><Check size={14}/>사전 지식 없이 시작</span><span><Check size={14}/>단계별 미션 학습</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-grid"/><div className="art-node node-one"><Network size={21}/></div><div className="art-node node-two"><LockKeyhole size={21}/></div><div className="art-node node-three"><Database size={20}/></div><div className="shield-frame"><Shield className="big-shield" strokeWidth={1}/><LockKeyhole className="shield-lock" size={38} strokeWidth={1.5}/></div><span className="art-caption"><span className="status-dot"/>SECURE YOUR NEXT MOVE</span><span className="art-coordinate">SYS.01 / DEFENSE</span></div></section>
        <section className="journey"><div className="section-title"><div><h2>다섯 번의 미션, 하나의 성장</h2><p>기초부터 실전까지, 한 단계씩 보안 감각을 키워보세요.</p></div><span className="tiny-label">LEARNING ROADMAP <span>01 — 05</span></span></div><div className="mission-grid">{missions.map((m, i) => <a href="#/missions" className="mission-card" key={m.title}><div className="card-top"><m.icon size={23} strokeWidth={1.5}/><span>0{i+1}</span></div><div className="card-tag">{m.tag}</div><h3>{m.title}</h3><div className="card-bottom"><span>준비 중</span><ArrowUpRight size={16}/></div></a>)}</div></section>
        <section className="intro-strip"><div className="intro-symbol"><BookOpen size={25} strokeWidth={1.5}/></div><div><span className="eyebrow">ABOUT THE PROJECT</span><h2>보안은 특별한 사람만의 일이 아니니까.</h2><p>CYBER DUEL은 누구나 쉽게 시작할 수 있는 한국어 사이버보안 교육 게임입니다.<br className="desktop-break"/>정답을 외우는 대신, 직접 선택하고 이해하는 경험을 만들어갑니다.</p></div><a className="text-link" href="#/about">프로젝트 소개<ArrowUpRight size={17}/></a></section>
      </> : page === 'missions' ? <>
        <div className="page-heading"><div><div className="eyebrow">MISSION SELECT</div><h1>당신의 첫 번째 보안 미션</h1><p>앞으로 만나게 될 다섯 가지 도전을 살펴보세요.</p></div></div><div className="notice"><Flag size={20}/><div><strong>미션을 준비하고 있어요</strong><p>현재는 메인 화면과 학습 안내를 둘러볼 수 있습니다. 실제 게임은 차례대로 추가될 예정이에요.</p></div></div><div className="mission-list">{missions.map((m, i) => <article className="mission-row" key={m.title}><div className="mission-number">0{i+1}</div><m.icon size={26}/><div><span className="eyebrow">{m.tag}</span><h2>{m.title}</h2><p>{m.description}</p></div><span className="outline-badge"><LockKeyhole size={13}/>준비 중</span></article>)}</div><a className="button secondary back-link" href="#/academy">먼저 보안 개념 살펴보기<ArrowRight size={17}/></a>
      </> : page === 'academy' ? <>
        <div className="page-heading"><div><div className="eyebrow">SECURITY ACADEMY</div><h1>보안 아카데미</h1><p>처음 만나는 보안 개념, 쉬운 말로 하나씩 알아가요.</p></div></div><div className="academy-grid">{[
          ['네트워크와 방화벽', '네트워크는 기기들이 정보를 주고받는 길이에요. 방화벽은 그 길의 출입문에서 정해진 규칙에 따라 통신을 허용하거나 차단하는 역할을 해요.', '방화벽은 모든 공격을 막아주지는 않아요. 올바른 규칙과 꾸준한 점검이 필요해요.'],
          ['계정과 비밀번호', '비밀번호는 계정의 열쇠예요. 길고 추측하기 어려운 비밀번호를 사용하고, 서비스마다 다른 비밀번호를 쓰는 것이 좋아요.', '가능하면 다중 인증(MFA)을 켜서 보호 장치를 하나 더 추가해 보세요.'],
          ['로그와 이상 탐지', '로그는 시스템에서 일어난 일을 기록한 일기예요. 평소와 다른 시간이나 장소에서 반복되는 로그인 시도는 확인이 필요한 단서가 될 수 있어요.', '낯선 기록이 있다고 무조건 공격은 아니에요. 여러 정보를 함께 살펴보세요.'],
          ['SQL 인젝션', 'SQL은 데이터베이스에 정보를 요청하는 언어예요. 사용자가 입력한 내용을 명령으로 잘못 처리하면, 공격자가 데이터에 접근할 수 있어요.', '개발자는 매개변수화된 쿼리를 사용하고 필요한 권한만 부여해야 해요.'],
          ['보안 사고 대응', '사고가 의심되면 상황을 확인하고, 피해가 퍼지지 않게 막고, 원인을 조사한 뒤 안전하게 복구해요.', '기록을 보존하고 담당자에게 알려요. 증거를 지우거나 혼자 판단해 대응하지 마세요.'],
        ].map(([title, description, tip], i) => <article className="academy-card" key={title}><span className="eyebrow">LESSON 0{i+1}</span><h2>{title}</h2><p>{description}</p><div className="lesson-tip"><Shield size={17}/><p>{tip}</p></div></article>)}</div>
      </> : <>
        <div className="page-heading"><div><div className="eyebrow">ABOUT CYBER DUEL</div><h1>더 안전한 디지털 세상을 향해</h1><p>직접 경험하며 배우는, 모두를 위한 보안 교육.</p></div></div><section className="about-panel"><span className="brand-icon"><Shield size={28}/></span><h2>배움이 방어력이 되는 곳,<br/>CYBER DUEL</h2><p>CYBER DUEL은 사이버보안을 처음 접하는 학생도 쉽게 배울 수 있도록 만드는 한국어 교육 게임입니다. 가상의 상황에서 선택하고 결과를 이해하며, 일상에서 사용할 수 있는 보안 습관을 기르는 것이 목표예요.</p><div className="about-values"><span>01 <strong>쉬운 한국어</strong></span><span>02 <strong>직접 하는 학습</strong></span><span>03 <strong>안전한 모의 환경</strong></span></div><p className="about-note">현재는 첫 번째 버전으로 메인 화면과 학습 안내를 제공합니다. 다섯 단계의 플레이 미션은 앞으로 추가될 예정입니다. 모든 실습은 허가된 모의 환경에서만 진행하는 것을 원칙으로 합니다.</p><a className="button primary" href="#/missions">미션 로드맵 보기<ArrowRight size={17}/></a></section>
      </>}
      <footer><span>© {new Date().getFullYear()} CYBER DUEL</span><span>배우고, 판단하고, 지켜내세요.<span className="footer-divider">/</span>Built for curious minds.</span><span><span className="status-dot"/>작은 시작, 단단한 보안</span></footer>
    </main></div>
  </div>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
