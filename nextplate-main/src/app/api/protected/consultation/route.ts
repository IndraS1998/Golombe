import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

interface client extends RowDataPacket{
  ID_CLIENT: string;
  EMAIL: string; 
  NOM: string; 
  D_CREATION: string;
  NUMTEL: string; 
  NUMCOMPTE: string;
}

interface valparres extends RowDataPacket{
  MONTANT:number;
}

export async function POST(req: Request) {
  const {utilisateur,startDate,endDate} = await req.json();

  if (!utilisateur || !startDate || !endDate) {
    return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
  }

  const con = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "test_db",
    port: Number(process.env.MYSQL_PORT) || 3306,
  });
  try{
    // Query 1: Retrieve client information
    const [clientInfo] = await con.execute<client[]>( 
      'SELECT ID_CLIENT, EMAIL, NOM, D_CREATION, NUMTEL, NUMCOMPTE FROM CLIENT WHERE ID_CLIENT = ?',
      [utilisateur]
    );

    // Query 2: Retrieve system parameters
    const [systemParams] = await con.execute('SELECT * FROM PARAMETRE');

    // Query 3: Calculate total purchases by the client
    const [totalSales] = await con.execute(
        'SELECT ST.ID_SORTIESTOCK, SUM(AV.PRIXVENTE) AS TOTALVENTE FROM SORTIE_STOCK ST, ARTICLEVENDU AV WHERE ST.ID_SORTIESTOCK = AV.ID_SORTIESTOCK AND ST.DATESORTIESTOCK BETWEEN ? AND ? AND ID_CLIENT = ? AND STATUT = "V"',
        [startDate, endDate, utilisateur]
    );

    // Query 4: Retrieve distinct articles sold within the period for a client
    const [articlesSold] = await con.execute(
        'SELECT AV.ID_ARTICLE, SUM(AV.QTESORTIE) AS QTE, A.LIBELLE, A.POINTS FROM ARTICLEVENDU AV, SORTIE_STOCK ST, ARTICLE A WHERE A.ID_ARTICLE = AV.ID_ARTICLE AND AV.ID_SORTIESTOCK = ST.ID_SORTIESTOCK AND ST.ID_CLIENT = ? AND ST.DATESORTIESTOCK BETWEEN ? AND ? AND ST.STATUT = "V" GROUP BY AV.ID_ARTICLE',
        [utilisateur, startDate, endDate]
    );

    // Query 5: Retrieve client subscriptions and sponsorships
    const [clientSubscriptions]: [Array<any>, any] = await con.execute(
        'SELECT ID_CLIENT, NOM, NUMTEL, D_CREATION FROM CLIENT WHERE (ID_CLIENT = ? OR ID_PARRAIN = ?) AND D_CREATION BETWEEN ? AND ?',
        [utilisateur, utilisateur, startDate, endDate]
    );
    const [downlineSubscriptions]:[Array<any>, any] = await con.execute(
        'SELECT count(*) FROM CLIENT WHERE ID_PARRAIN = ? AND D_CREATION BETWEEN ? AND ?',
        [utilisateur, startDate, endDate]
    );
    // Query 6: Retrieve distinct downline clients who made purchases
    const [downlineClients] = await con.execute(
        'SELECT DISTINCT C.ID_CLIENT, C.NOM FROM CLIENT C, SORTIE_STOCK ST WHERE C.ID_CLIENT = ST.ID_CLIENT AND C.ID_PARRAIN = ? AND DATESORTIESTOCK BETWEEN ? AND ? AND ST.STATUT = "V"',
        [utilisateur, startDate, endDate]
    )as [Array<{ ID_CLIENT: string, NOM: string }>, any];

    // Query 7: Retrieve articles purchased by a downline client (for each downline client)
    let downlinePurchases = [];
    for (const client of downlineClients) {
        const [purchases] = await con.execute(
            'SELECT A.LIBELLE, A.POINTS, SUM(AV.QTESORTIE) AS QTE, AV.ID_ARTICLE FROM ARTICLE A, ARTICLEVENDU AV, SORTIE_STOCK ST WHERE A.ID_ARTICLE = AV.ID_ARTICLE AND AV.ID_SORTIESTOCK = ST.ID_SORTIESTOCK AND ST.ID_CLIENT = ? AND ST.DATESORTIESTOCK BETWEEN ? AND ? AND ST.STATUT = "V" GROUP BY AV.ID_ARTICLE',
            [client.ID_CLIENT, startDate, endDate]
        );
        downlinePurchases.push({ client: client.ID_CLIENT,nom:client.NOM, purchases });
    }

    // Convert ttbilanpvnet to an integer
    const ttbilanpvnetInt =  (articlesSold as any).reduce((acc: number,article: { QTE: number; POINTS: number; })=> acc + (article.QTE * article.POINTS),0) + (clientSubscriptions as any[]).length * 35;
    let palier;
    // Define the SQL query based on the ttbilanpvnet value
    let sql13;
    let params13:string[];
    if (ttbilanpvnetInt >= 120) {
      palier = 2;
      params13 = [startDate, endDate, clientInfo[0].ID_CLIENT, clientInfo[0].ID_CLIENT];
      sql13 = `
        SELECT  a.id_article, a.libelle, sum(av.qtesortie) as ttqtesortie 
        FROM article a, articlevendu av, client c, sortie_stock st 
        WHERE st.id_sortiestock=av.id_sortiestock and 
              st.id_client=c.id_client and 
              a.id_article=av.id_article and 
              st.datesortiestock 
              BETWEEN ? and ? and st.STATUT='V' and 
              (c.id_client=? or c.id_parrain=?)   
        GROUP BY a.libelle
      `;
    } else {
      palier = 1;
      params13 = [startDate, endDate, clientInfo[0].ID_CLIENT];
      sql13 = `
        SELECT  a.id_article, a.libelle, sum(av.qtesortie) as ttqtesortie 
        FROM article a, articlevendu av, client c, sortie_stock st 
        WHERE st.id_sortiestock=av.id_sortiestock and 
              st.id_client=c.id_client and 
              a.id_article=av.id_article and 
              st.datesortiestock 
              BETWEEN ? and ? and st.STATUT='V' and c.id_client=?  
        GROUP BY a.libelle
      `;
    }

    // Fetch the article details
    const [results] = await con.execute(sql13, params13);
    
    let valtotalar = 0;
    const details = [];
  
      // Loop through results and fetch individual article values
    for (const row of results as any[]) {
      const { id_article, libelle, ttqtesortie } = row;
      // Fetch the value per article
      const sql14 = `
        SELECT MONTANT FROM VAL_PV_ARTICLE
        WHERE ID_ARTICLE = ? AND ID_PALIER = ?
      `;
      const [valpvarResults] = await con.execute<valparres[]>(sql14, [id_article, palier]);
      let valpvar = 0;
      if (valpvarResults.length > 0) {
        valpvar = (valpvarResults as any)[0].MONTANT;
      }

      const valar = ttqtesortie * valpvar;
      valtotalar += valar;
      
      // Push the article details to the array
      details.push({
        libelle,
        ttqtesortie,
        valpvar,
        valar
      });
    }

    // Calculate the rebate (ristourne)
    const Valabonnementpropre = 100;  // This should come from your business logic or query
    const valdownlines = 50;  // This should also be calculated based on your data

    const mtristourne = Valabonnementpropre + valdownlines + valtotalar;
    
    return NextResponse.json({ 
      success: true, 
      rows : {
        clientInfo,
        systemParams,
        totalSales,
        articlesSold,
        clientSubscriptions,
        downlineClients,
        downlinePurchases,
        palier,downlineSubscriptions,
        global:{details,valtotalar,mtristourne}
      }
    });

  }catch(e){
    if(e instanceof Error){
      console.log(e,"error occurs here");
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }else{
      return NextResponse.json({ success: false, error: "Unknown error" }, { status: 500 });
    }
  }finally{
    await con.end()
  }
}
