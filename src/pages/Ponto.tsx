import { useState, useEffect } from "react";
import {
  Button,
  Form,
  Container,
  Row,
  Col,
  Table,
  Spinner,
} from "react-bootstrap";
import initSqlJs, { Database } from "sql.js";
import { set, get } from "idb-keyval";

// Define a interface para os registros de ponto
interface Entry {
  id: number;
  nome: string;
  tipo: string;
  hora: string;
}

export function Ponto() {
  const [db, setDb] = useState<Database | null>(null); // Estado para o banco de dados
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [entries, setEntries] = useState<Entry[]>([]); // Estado para os registros de ponto
  const [loadingEntries, setLoadingEntries] = useState(false); // Estado de carregamento para as entradas
  const [nome, setNome] = useState("Jéssica"); // Estado para o nome do usuário

  useEffect(() => {
    // Função para carregar o banco de dados do IndexedDB ou criar um novo
    const loadDb = async () => {
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });
      let db: Database;

      // Tenta carregar o banco de dados salvo no IndexedDB
      const savedDb = await get("ponto-db");
      if (savedDb) {
        db = new SQL.Database(new Uint8Array(savedDb));
      } else {
        db = new SQL.Database();
        // Cria tabela caso não exista
        db.run(`
          CREATE TABLE IF NOT EXISTS ponto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            tipo TEXT,
            hora TEXT
          )
        `);
      }

      setDb(db);
      carregarEntradas(db); // Carregar registros de ponto
      setLoading(false);
    };

    loadDb();
  }, []);

  // Função para salvar o banco de dados no IndexedDB
  const salvarDb = () => {
    if (db) {
      const data = db.export();
      set("ponto-db", data); // Salva no IndexedDB
    }
  };

  // Função para registrar ponto de entrada ou saída
  const registrarPonto = (tipo: string) => {
    if (db && nome) {
      const now = new Date().toLocaleString();
      db.run(`INSERT INTO ponto (nome, tipo, hora) VALUES (?, ?, ?)`, [
        nome,
        tipo,
        now,
      ]);
      salvarDb(); // Salva as alterações no IndexedDB
      carregarEntradas(db);
    }
  };

  // Função para carregar as entradas de ponto do banco de dados
  const carregarEntradas = (dbInstance: Database) => {
    setLoadingEntries(true);
    const result = dbInstance.exec("SELECT * FROM ponto");
    if (result.length > 0) {
      const formattedEntries = result[0].values.map((row) => ({
        id: row[0] as number,
        nome: row[1] as string,
        tipo: row[2] as string,
        hora: row[3] as string,
      }));
      setEntries(formattedEntries);
    } else {
      setEntries([]);
    }
    setLoadingEntries(false);
  };

  return (
    <Container>
      <h1 className="my-4">Sistema de Batida de Ponto</h1>
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          <Row className="mb-4">
            <Col>
              <Form.Group controlId="nome">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Digite seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col className="align-self-end">
              <Button
                variant="success"
                onClick={() => registrarPonto("Entrada")}
                className="me-2"
              >
                Registrar Entrada
              </Button>
              <Button variant="danger" onClick={() => registrarPonto("Saída")}>
                Registrar Saída
              </Button>
            </Col>
          </Row>

          <h3 className="my-4">Registros</h3>
          {loadingEntries ? (
            <Spinner animation="border" />
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.id}</td>
                    <td>{entry.nome}</td>
                    <td>{entry.tipo}</td>
                    <td>{entry.hora}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </Container>
  );
}
