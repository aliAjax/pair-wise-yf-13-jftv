import "./styles.css";
import BunkerPage from "./bunker/BunkerPage";

function App() {
  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62001 · 船舶轮机值班 · Port 62001</p>
        <h1>燃油加装验收</h1>
        <span>
          靠港加装燃油时，先登记供应船、油品、封签号和各受油舱计划量，再逐舱填写开始存量、结束存量与舱容上限，
          超出舱容的部分不许入账。计量单总重量与各舱入账增量相差超过 1% 即停在待处理，写明处理人后才能签收；
          未签收单据自动进入交接摘要。记录保存在本机浏览器。
        </span>
      </section>
      <BunkerPage />
    </main>
  );
}

export default App;
