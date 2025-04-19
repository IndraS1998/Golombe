"use client";

import React, { useState,useEffect,useRef,useCallback } from "react";
import PageHeader from "@/partials/PageHeader";
import WarningAlert from "@/components/Alert";
import SeoMeta from "@/partials/SeoMeta";
import { useRouter } from "next/navigation";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from "moment";


interface Client{
  NOM : string;
  ID_CLIENT : string;
}

function insertCharacter(value: string):string{
  const split = value.split("");
  let counter = 0;
  for(let i = split.length;i>0;i--){
    if(counter == 3){
      split.splice(i,0," ");
      counter = 0;
    }
    counter++;
  }
  return split.join("");
};

function printDate(d:string):string{
  return moment(d).format('YYYY-MM-DD');;
}

const Consultation = () => {
  const title : string = "Page de Consultation"
  const description : string = "this is meta description"
  const meta_title : string = ""
  const image : string = "/images/logo.png"
  const r = useRouter();
  const pdfref = useRef<HTMLDivElement>(null)

  interface client{
    ID_CLIENT: string;
    EMAIL: string; 
    NOM: string; 
    D_CREATION: string;
    NUMTEL: string; 
    NUMCOMPTE: string;
  }

  interface params{
    ID_PARAMETRE:string;
    EXERCICE:string;
    TVA:number;
    AIR:string;
    VALABONNEMENT:string;
    PVABONNEMENT:string;
    PVABONNEMENTPROPRE:string;
    VALABONNEMENTPROPRE:string;
  }

  interface totalSales{
    TOTALVENTE: number;
  }

  interface article{
    LIBELLE:string;
    QTE:number;
    POINTS:number;
  }

  interface purchase{
    LIBELLE: string;
    POINTS: number;
    QTE:number;
    ID_ARTICLE:string;
  }

  interface purchaseWithClient{
    client:string;
    nom:string;
    purchases:purchase[];
  }

  interface detailPerAr{
    libelle: string;
    ttqtesortie: string;
    valpvar: string;
    valar: string;
  }

  const [loginFailed, setLoginFailed] = useState(false);
  const [clients,setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [errormessage,setErrorMessage] = useState<string>('');
  const [displayConsultation,setDisplayConsultation] = useState<boolean>(false);
  const [clientInfo,setclientInfo] = useState<client>();
  const [systemParams,setsystemParams] = useState<params>();
  const [totalSales,settotalSales] = useState<totalSales>();
  const [articlesSold,setarticlesSold] = useState<article[]>();
  const [clientSubscriptions,setclientSubscriptions] = useState<client[]>([]);
  const [downlinePurchases,setdownlinePurchases] = useState<purchaseWithClient[]>();
  const [palier,setPalier] = useState<string>('');
  const [details,setDetails] = useState<detailPerAr[]>();
  const [loadingPdf,setLoadingPdf] = useState<boolean>();
  const [fetched,setFetched] = useState<boolean>(false);
  const [downlineSubs,setDownlineSubs] = useState<number>(0)
  const primaryColorPdf : [number,number,number] = [73,80,87];
  const secondaryColorPdf : [number, number, number]= [108,117,125];
  const yellow : [number,number,number] = [201,162,39];
  const green : [number,number,number] = [64,145,108];
  const darkTextPdf : [number,number,number] = [33,37,41];
  const lightTextPdf : [number,number,number] = [248,249,250];

  const [formData, setFormData] = useState({
    utilisateur: '',
    MCC: '',
    startDate: '',
    endDate: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  
  const Spinner = () => {
    return (
      <div className="flex justify-center items-center mt-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-b-slate-800"></div>
      </div>
    );
  };
  
  const fetchUsers = useCallback(async ()=>{
    setLoading(true);
    try{
      const token = localStorage.getItem("token");
      if (!token){
        r.replace("/connexion")
      }
      const response = await fetch('/api/protected/clients',{
          headers : {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          }
      })
      if (!response.ok) {
        setErrorMessage("Erreur de connexion!");
        setLoginFailed(true);
        return;
      }

      const data = await response.json();
      if(data.success){
        setClients(data.rows)
      }
    }catch (err){
      setErrorMessage("Erreur de connexion!" + err);
      setLoginFailed(true);
    }finally{
      setLoading(false);
    }
  },[r]);
  
  useEffect(() => {
    fetchUsers().then(()=>{});
  },[fetchUsers]);

  
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("/api/protected/consultation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (result.success) {
        const {clientInfo,
          systemParams,
          totalSales,
          articlesSold,
          clientSubscriptions,downlineSubscriptions,
          downlinePurchases,global,palier} = result.rows;

          setclientInfo(clientInfo[0]);
          settotalSales(totalSales[0]);
          setsystemParams(systemParams[0]);
          setarticlesSold(articlesSold);
          setclientSubscriptions(clientSubscriptions);
          setdownlinePurchases(downlinePurchases);
          setDetails(global.details);
          setPalier(palier);
          setDownlineSubs(downlineSubscriptions[0]["count(*)"]);

          setDisplayConsultation(true);
          setFetched(true);
          setLoginFailed(false);
      } else {
        setErrorMessage("Erreur de connexion");
        setLoginFailed(true);
      }
    } catch (error) {
      console.error("Error :", error);
      setErrorMessage("Erruer de connexion");
      setLoginFailed(true);
    } finally {
      setLoading(false);
    }
  }
  
  const generatePDF = () => {
    setLoadingPdf(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Add Image
    const imgData = 'images/golombe2.png'; // Replace with your base64 image data or URL
    doc.addImage(imgData, 'PNG', pageWidth - 47, 0, 35, 25); // Adjust the position and size of the image

    // Add Header
    doc.setFontSize(12);
    doc.setFont("courier", "bold");
    doc.setFillColor(darkTextPdf[0],darkTextPdf[1],darkTextPdf[2]);
    doc.text('Bilan PV et Ristournes Client', 15, 10, { align: "left" });

    // Add Period
    doc.setFontSize(8);
    doc.text(`Période Du: ${formData.startDate} au ${formData.endDate}`, 15, 15,{ align: "left" });

    // Add Client Info
    insertTable(doc,"Info Client",25,[["Client","N° WhatsApp","N° Compte"]],[[clientInfo?.NOM,clientInfo?.NUMTEL,clientInfo?.NUMCOMPTE]]);

    // Add Chiffre d'Affaire Table
    const caData = [
      [
        systemParams && totalSales
          ? insertCharacter(Math.round(((totalSales.TOTALVENTE*100) / (systemParams.TVA + 100))).toString())
          : 'N/A',
        systemParams && totalSales
          ? insertCharacter(Math.round((systemParams.TVA *  ((totalSales.TOTALVENTE*100) / (systemParams.TVA + 100)))/100).toString())
          : 'N/A',
        insertCharacter((totalSales?.TOTALVENTE ?? 0).toString()),
      ],
    ];
    insertTable(doc, 'Paramètres', (doc as any).lastAutoTable.finalY + 10, [['CA HT', `TVA (${systemParams?.TVA} %)`, 'CA TTC']], caData);

    // Add Achats et PV Correspondants Table
    const articlesData = articlesSold?.map((article) => [
      article.LIBELLE,
      article.QTE.toString(),
      article.POINTS.toString(),
      (article.QTE * article.POINTS).toString(),
    ]);
    if (articlesData) {
      articlesData.push([
        'Totaux',
        articlesSold ? articlesSold.reduce((acc, article) => acc + article.QTE, 0).toString() : "NA",
        '/',
        articlesSold ? articlesSold.reduce((acc, article) => acc + article.QTE * article.POINTS, 0).toString() : "NA",
      ]);
      insertTable(doc,'Achats et PV Correspondants',
        (doc as any).lastAutoTable.finalY + 10,[['Libelle', 'Qte', 'PV au Colis', 'Total PV']],articlesData);
    }

    // Add Abonnement et Parrainages Table
    const subscriptionsData = clientSubscriptions.map((client) => [
      client.ID_CLIENT,
      client.NOM,
      client.NUMTEL,
      printDate(client.D_CREATION),
    ]);

    if(subscriptionsData){
      subscriptionsData.push([
        'Totaux',
        `Nombre d'abonnement(s) : ${clientSubscriptions.length}`,
        `PV abonnement : ${clientSubscriptions.length * 35}`,
        '',
      ]);
      insertTable(doc,'Abonnement et/ou Parrainage(s) effectué(s)',
        (doc as any).lastAutoTable.finalY + 10,[['Code client', 'Nom et prénoms', 'N° Tel', 'Date Abonnement']],subscriptionsData);
    }

    // Add Achats et PV Correspondants des Downlines
    addStyledHeading(doc, 'Achats et PV Correspondants des Downlines', (doc as any).lastAutoTable.finalY + 10);
    downlinePurchases?.forEach((pc,index) => {
      const purchasesData = pc.purchases.map((purchase) => [
        purchase.LIBELLE,
        purchase.QTE.toString(),
        purchase.POINTS.toString(),
        (purchase.QTE * purchase.POINTS).toString(),
      ]);
      purchasesData.push([
        'Sous-Total',
        pc.purchases.reduce((acc, purchase) => acc + purchase.QTE, 0).toString(),
        '/',
        pc.purchases.reduce((acc, purchase) => acc + purchase.QTE * purchase.POINTS, 0).toString(),
      ]);
      let width;
      if (index == 0) {
        width = (doc as any).lastAutoTable.finalY + 20;
      }else{
        width = (doc as any).lastAutoTable.finalY + 10;
      }
      insertTable(doc,`${pc.nom} (${pc.client})`,width,
        [['Libelle', 'Qte', 'PV au Colis', 'Total PV']],purchasesData);
    });

    // Add Total PV
    const downlines = downlinePurchases ? insertCharacter(downlinePurchases.reduce((acc, dn) => acc + dn.purchases.reduce((a, p) => a + p.QTE * p.POINTS, 0), 0).toString()) : "NA"
    addStyledHeading(doc,`Total PV Downline(s) : ${downlines}`,(doc as any).lastAutoTable.finalY + 10);
    
    const totalPv = articlesSold && downlinePurchases && clientSubscriptions?insertCharacter((downlinePurchases.reduce((acc,dn)=>acc+(dn.purchases.reduce((a,p)=>a+(p.QTE*p.POINTS),0)),0) + (clientSubscriptions.length * 35) + articlesSold.reduce((acc,article)=> acc + (article.QTE * article.POINTS),0)).toString()):"NA" 
    addStyledHeading(doc,`Total PV : ${totalPv}`,(doc as any).lastAutoTable.finalY + 20,green);

    // Add Calcul Correspondante
    insertTable(doc, "Calcul de la Ristourne Correspondante", (doc as any).lastAutoTable.finalY + 30, [["Libelle", "Qte", "Valeur Unitaire", "Valeur Totale"]], [
      ["Total des PV", articlesSold && downlinePurchases && clientSubscriptions?insertCharacter((downlinePurchases.reduce((acc,dn)=>acc+(dn.purchases.reduce((a,p)=>a+(p.QTE*p.POINTS),0)),0) + (clientSubscriptions.length * 35) + articlesSold.reduce((acc,article)=> acc + (article.QTE * article.POINTS),0)).toString()):"NA", "/", `Palier: ${palier}`],
      clientInfo?.D_CREATION && clientInfo.D_CREATION >= formData.startDate && clientInfo.D_CREATION <= formData.endDate && 
      [`Abonnement (${printDate(clientInfo?.D_CREATION)})`, "1", systemParams?insertCharacter(systemParams.VALABONNEMENTPROPRE.toString()):"NA", systemParams?insertCharacter(systemParams.VALABONNEMENTPROPRE.toString()):"NA"],
      (+palier >= 2) && ["Parrainage downline(s)", `${downlineSubs}`, `${systemParams?insertCharacter(systemParams.VALABONNEMENT.toString()):"NA"}`, `${systemParams
        ?insertCharacter((downlineSubs * Number(systemParams.VALABONNEMENT ?? 0)).toString())
        :"NA"}`]
    ])
    
    // Add Achats Correspondante
    insertTable(doc, "Achats et Ristournes Correspondants", (doc as any).lastAutoTable.finalY + 10, [["Libelle", "Qte", "Valeur Unitaire (F CFA)", "Valeur Totale (F CFA)"]], details?details.map(d => [d.libelle, d.ttqtesortie, insertCharacter(d.valpvar.toString()), insertCharacter(d.valar.toString())]):[]);

    // Add Montant Ristourne
    const subTotal =  insertCharacter((details?.reduce((acc,dv)=>acc+Number(dv.valar),0) ?? 0).toString())
    addStyledHeading(doc,`Sous Total Achats: ${subTotal} F CFA`,(doc as any).lastAutoTable.finalY + 10);
    
    // Add Montant Ristourne
    const totalR = details && systemParams && clientInfo? insertCharacter((
      (details.reduce((acc,dv)=>acc+Number(dv.valar),0)) + 
      (downlineSubs * Number(systemParams.VALABONNEMENT ?? 0) + 
      +((clientInfo.D_CREATION >= formData.startDate && clientInfo.D_CREATION <= formData.endDate) ? systemParams.VALABONNEMENTPROPRE:0))
    ).toString()):'NA'

    addStyledHeading(doc,`MONTANT RISTOURNE: ${totalR} F CFA`, (doc as any).lastAutoTable.finalY + 25,yellow);

    // Add Footer
    doc.setFontSize(10);
    doc.setTextColor(darkTextPdf[0],darkTextPdf[1],darkTextPdf[2]); 
    doc.text(`Page ${(doc as any).internal.getNumberOfPages()}`, 105, 295, { align: "center" });

    // Save PDF
    doc.save(`Bilan ${clientInfo?.NOM}.pdf`);
    setLoadingPdf(false);
  };

  
  const addStyledSubheading = (doc: jsPDF, text: string, y: number,marginX = 14) => {
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - 2 * marginX; // Width respecting margins
    const rectHeight = 8; // Compact height

    // Background color (respects margins)
    doc.setFillColor(primaryColorPdf[0],primaryColorPdf[1],primaryColorPdf[2]);
    doc.rect(marginX, y - rectHeight / 2, contentWidth, rectHeight, 'F');

    // White text, centered within the content area
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(lightTextPdf[0],lightTextPdf[1],lightTextPdf[2]); // White text
    doc.text(text, pageWidth / 2, y + rectHeight / 4, { align: "center" });
  };

  const addStyledHeading = (doc: jsPDF, text: string, y: number,c = primaryColorPdf, marginX = 14) => {
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - 2 * marginX; // Width respecting margins
    const rectHeight = 8; // Compact height

    // Background color (respects margins)
    doc.setFillColor(c[0],c[1],c[2]);
    doc.rect(marginX, y - rectHeight / 2, contentWidth, rectHeight, 'F');

    // White text, centered within the content area
    doc.setFont("courier", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(lightTextPdf[0],lightTextPdf[1],lightTextPdf[2]); // White text
    doc.text(text, pageWidth / 2, y + rectHeight / 4, { align: "center" });
  };

  const insertTable = (doc: jsPDF, title: string, startY: number, head: any[], body: any[]) => {
    addStyledSubheading(doc, title, startY);
    autoTable(doc, {
      startY: startY + 5,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: secondaryColorPdf },
      alternateRowStyles: { fillColor: lightTextPdf },
      styles : {fontSize: 8,font:"courier",fontStyle: "bold",},
    });
  };

  return (
    <>
      <SeoMeta title={title} meta_title={meta_title} description={description} image={image} />
      <PageHeader title={title} />
      <section className="section-sm">
        <div className="container">
          <div className="row">
            <div className="mx-auto md:col-10 lg:col-6">
              <h4 className="mb-4">
                Consultation du Bilan PV et Ristournes Client
              </h4>
              {loginFailed && <WarningAlert message={errormessage} />}
              {!displayConsultation && 
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: Category and Description */}
                {loading? <Spinner /> :
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="utilisateur" className="form-label">
                        Client <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="utilisateur"
                        name="utilisateur"
                        className="mt-1 block w-full p-2 border form-input"
                        value={formData.utilisateur}
                        onChange={handleChange}
                        required
                      >
                        {clients?.map((c,i)=>(
                          <option key={i} value={c.ID_CLIENT}>
                            {c.NOM}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="MCC" className="form-label">
                        Mot Clé (Client)
                      </label>
                      <input
                        id="MCC"
                        name="MCC"
                        type="text"
                        className="mt-1 block w-full p-2 form-input"
                        value={formData.MCC}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Row 2: Start Date and End Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="startDate" className="form-label">
                        Date Début <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        className="mt-1 block w-full p-2 border form-input"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate" className="form-label">
                        Date Fin <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        className="mt-1 block w-full p-2 border form-input"
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button type="submit"
                    className="btn btn-primary cursor-pointer inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md"
                  >
                    {loading ? "Connexion..." : "Soumettre"}
                  </button>
                  {fetched && <button className="ml-2 not-only:btn btn-primary cursor-pointer inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md"
                  onClick={()=>{setDisplayConsultation(true)}}>
                    Afficher la consultation
                  </button>}
                </>}
              </form>
              }
            </div>
          </div>
          {displayConsultation && <div className="max-w-6xl mx-auto p-5" ref={pdfref}>
            <button onClick={generatePDF} className="ml-2 btn btn-primary cursor-pointer inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md">
              {loadingPdf ? "Connexion..." : "Télécharger"}
            </button>
            <button onClick={()=>{setDisplayConsultation(false)}} 
              className="ml-2 btn btn-primary cursor-pointer inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md">
              Consulter
            </button>
            {/* Client Info */}
            <div className="text-center my-4">
              <h3 className="text-2xl font-bold bg-gray-200">Bilan PV et Ristournes Client</h3>
              <p className="text-lg"><span className="font-bold">Client :</span> {clientInfo?.NOM}</p>
              <p className="text-lg"><span className="font-bold">N° WhatsApp :</span> {clientInfo?.NUMTEL}</p>
              <p className="text-lg"><span className="font-bold">N° Compte :</span> {clientInfo?.NUMCOMPTE}</p>
            </div>

            {/* Period */}
            <div className="text-center my-4">
              <h5 className="text-xl bg-gray-100">Période Du: {formData.startDate} au {formData.endDate} </h5>
            </div>

            {/* Chiffre d'Affaire */}
            <table className="table-auto w-full border border-gray-300 my-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left" colSpan={2}>CA HT</th>
                  <th className="px-4 py-2 text-left" colSpan={1}>TVA ({systemParams?.TVA} %)</th>
                  <th className="px-4 py-2 text-left" colSpan={1}>CA TTC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 text-sm" colSpan={2}>{systemParams && totalSales? insertCharacter(Math.round(((totalSales.TOTALVENTE*100) / (systemParams.TVA + 100))).toString()):"N/A"}</td>
                  <td className="px-4 py-2 text-sm" colSpan={1}>{systemParams && totalSales? insertCharacter(Math.round((systemParams.TVA *  ((totalSales.TOTALVENTE*100) / (systemParams.TVA + 100)))/100).toString()):"N/A"}</td>
                  <td className="px-4 py-2 text-sm" colSpan={1}>{insertCharacter((totalSales?.TOTALVENTE ?? '0').toString())}</td>
                </tr>
              </tbody>
            </table>

            {/* Ristournes de Base */}
            <div className="text-center my-4">
              <h5 className="text-xl bg-gray-100">Achats et PV Correspondants</h5>
            </div>
            <table className="table-auto w-full border border-gray-300 my-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">Libelle</th>
                  <th className="px-4 py-2 text-center">Qte</th>
                  <th className="px-4 py-2 text-center">PV au Colis</th>
                  <th className="px-4 py-2 text-center">Total PV</th>
                </tr>
              </thead>
              <tbody>
                {articlesSold?.map((article,index)=>(
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm">{article.LIBELLE}</td>
                    <td className="px-4 py-2 text-sm text-center">{article.QTE}</td>
                    <td className="px-4 py-2 text-sm text-center">{article.POINTS}</td>
                    <td className="px-4 py-2 text-sm text-center">{article.POINTS * article.QTE}</td>
                </tr>
                ))}
                <tr>
                    <td className="px-4 py-2 text-center text-lg font-bold">Totaux</td>
                    <td className="px-4 py-2 text-sm text-center font-bold">{articlesSold?.reduce((acc,article)=> acc + article.QTE,0)}</td>
                    <td className="px-4 py-2 text-sm text-center font-bold"> / </td>
                    <td className="px-4 py-2 text-sm text-center font-bold"> {articlesSold?.reduce((acc,article)=> acc + (article.QTE * article.POINTS),0)} </td>
                </tr>
              </tbody>
            </table>


            {/* Abonnement et parrainages */}
            <div className="text-center my-4">
              <h5 className="text-xl bg-gray-100">Abonnement et/ou Parrainage(s) effectué(s)</h5>
            </div>
            <table className="table-auto w-full border border-gray-300 my-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">Code client</th>
                  <th className="px-4 py-2 text-left">Nom et prénoms</th>
                  <th className="px-4 py-2 text-left">N° Tel</th>
                  <th className="px-4 py-2 text-left">Date Abonnement</th>
                </tr>
              </thead>
              <tbody>
              {clientSubscriptions?.length > 0 ? (
                clientSubscriptions.map((client, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm">{client.ID_CLIENT}</td>
                    <td className="px-4 py-2 text-sm">{client.NOM}</td>
                    <td className="px-4 py-2 text-sm">{client.NUMTEL}</td>
                    <td className="px-4 py-2 text-sm">{printDate(client.D_CREATION)}</td>
                  </tr>
                ))
                ) : (
                  <tr> 
                    <td className="px-4 py-2 text-sm" colSpan={4}>N/A</td>
                  </tr>
                )}
                <tr>
                    <td className="px-4 py-2 font-bold text-lg text-center">Totaux</td>
                    <td className="px-4 py-2 text-sm">Nombre d&apos;abonnement (s) : {clientSubscriptions?.length}</td>
                    <td className="px-4 py-2 text-sm">PV abonnement : {clientSubscriptions?.length * 35}</td>
                  </tr>
              </tbody>
            </table>
            
            {/* Achats et PV Correspondants des Downlines */}
            <div className="text-center my-4">
              <h5 className="text-2xl bg-gray-200">Achats et PV Correspondants des Downlines</h5>
            </div>
            <div className="text-center my-4">
              <h5 className="text-xl bg-gray-100">Noms et prenoms du Client Downline suivis de ces achats</h5>
            </div>
            {downlinePurchases?.map((pc,index)=>(
              <div key={index}>
                <div className="text-center my-4">
                  <p className="font-bold">{pc.nom} ({pc.client})</p>
                </div>
                <table key={index} className="table-auto w-full border border-gray-300 my-4">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-4 py-2 text-left">Libelle</th>
                      <th className="px-4 py-2 text-center">Qte</th>
                      <th className="px-4 py-2 text-center">PV au Colis</th>
                      <th className="px-4 py-2 text-center">Total PV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pc.purchases.map((purchase,index)=>(
                      <tr key={index}>
                        <td className="text-sm px-4 py-2">{purchase.LIBELLE}</td>
                        <td className="text-sm px-4 py-2 text-center">{purchase.QTE}</td>
                        <td className="text-sm px-4 py-2 text-center">{purchase.POINTS}</td>
                        <td className="text-sm px-4 py-2 text-center">{purchase.QTE * purchase.POINTS}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="text-sm px-4 py-2 font-bold">Sous-Total :</td>
                      <td className="text-sm px-4 py-2 text-center font-bold">{pc.purchases.reduce((acc,purchase)=>acc+purchase.QTE,0)}</td>
                      <td className="text-sm px-4 py-2 text-center font-bold">/</td>
                      <td className="text-sm px-4 py-2 text-center font-bold">{pc.purchases.reduce((acc,purchase)=>acc+(purchase.QTE*purchase.POINTS),0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Total PV */}
            <div className="text-center my-4">
              <h5 className="text-lg bg-gray-100">Total PV Downline(s) : {insertCharacter((downlinePurchases?.reduce((acc,dn)=>acc+(dn.purchases.reduce((a,p)=>a+(p.QTE*p.POINTS),0)),0) ?? '0').toString())}</h5>
            </div>
            <div className="text-center my-4 py-2 bg-green-400">
              <h5 className="text-xl" >
                Total PV : {articlesSold && downlinePurchases &&clientSubscriptions?insertCharacter((downlinePurchases.reduce((acc,dn)=>acc+(dn.purchases.reduce((a,p)=>a+(p.QTE*p.POINTS),0)),0) + (clientSubscriptions.length * 35) + articlesSold.reduce((acc,article)=> acc + (article.QTE * article.POINTS),0)).toString()):"NA"}
              </h5>
            </div>

            {/* Calcul correspondante */}
            <div className="text-center my-4">
              <h5 className="text-lg bg-gray-100">CALCUL DE LA RISTOURNE CORRESPONDANTE</h5>
            </div>
            <table className="table-auto w-full border border-gray-300 my-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">Libelle</th>
                  <th className="px-4 py-2 text-center">Qte</th>
                  <th className="px-4 py-2 text-center">Valeur Unitaire</th>
                  <th className="px-4 py-2 text-center">Valeur Totale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-sm px-4 py-2">Total des PV</td>
                  <td className="text-sm px-4 py-2 text-center">{articlesSold && downlinePurchases && clientSubscriptions?insertCharacter((downlinePurchases.reduce((acc,dn)=>acc+(dn.purchases.reduce((a,p)=>a+(p.QTE*p.POINTS),0)),0) + (clientSubscriptions.length * 35) + articlesSold.reduce((acc,article)=> acc + (article.QTE * article.POINTS),0)).toString()):"NA"}</td>
                  <td className="text-sm px-4 py-2 text-center">/</td>
                  <td className="text-sm px-4 py-2 text-center bg-amber-500">Palier Correspondant : {palier}</td>
                </tr>
                {clientInfo?.D_CREATION && clientInfo.D_CREATION >= formData.startDate && clientInfo.D_CREATION <= formData.endDate && 
                  (
                    <tr>
                      <td className="text-sm px-4 py-2">Abonnement ({printDate(clientInfo?.D_CREATION)})</td>
                      <td className="text-sm px-4 py-2 text-center">1</td>
                      <td className="text-sm px-4 py-2 text-center">{systemParams?insertCharacter(systemParams.VALABONNEMENTPROPRE.toString()):"NA"}</td>
                      <td className="text-sm px-4 py-2 text-center">{systemParams?insertCharacter(systemParams.VALABONNEMENTPROPRE.toString()):"NA"}</td>
                    </tr>
                  )
                }
                {
                  (+palier >= 2) && (
                    <tr>
                      <td className="text-sm px-4 py-2">Parrainage downline(s)</td>
                      <td className="text-sm px-4 py-2 text-center">{downlineSubs}</td>
                      <td className="text-sm px-4 py-2 text-center">{systemParams?insertCharacter(systemParams.VALABONNEMENT.toString()):"NA"}</td>
                      <td className="text-sm px-4 py-2 text-center">
                        {systemParams
                          ?insertCharacter((downlineSubs * Number(systemParams.VALABONNEMENT ?? 0)).toString())
                          :"NA"}
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>

            {/* Achats correspondante */}
            <div className="text-center my-4">
              <h5 className="text-lg bg-gray-100">ACHATS ET RISTOURNES CORRESPONDANTS</h5>
            </div>
            <table className="table-auto w-full border border-gray-300 my-4">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 text-left">Libelle</th>
                  <th className="px-4 py-2 text-center">Qte</th>
                  <th className="px-4 py-2 text-center">Valeur Unitaire</th>
                  <th className="px-4 py-2 text-center">Valeur Totale</th>
                </tr>
              </thead>
              <tbody>
                {details?.map((d,i)=>(<tr key={i}>
                  <td className="text-sm px-4 py-2">{d.libelle}</td>
                  <td className="text-sm px-4 py-2 text-center">{d.ttqtesortie}</td>
                  <td className="text-sm px-4 py-2 text-center">{insertCharacter(d.valpvar.toString())}</td>
                  <td className="text-sm px-4 py-2 text-center">{insertCharacter(d.valar.toString())}</td>
                </tr>))}
              </tbody>
            </table>
            <div className="text-center my-4 py-2 bg-gray-100">
              <h5 className="text-lg">Sous Total Achats : {insertCharacter((details?.reduce((acc,dv)=>acc+Number(dv.valar),0) ?? 0).toString())}</h5>
            </div>
            <div className="text-center my-4 py-2 bg-yellow-400">
              <h5 className="text-xl" >MONTANT RISTOURNE : {details && systemParams && clientInfo? insertCharacter((
                    (details.reduce((acc,dv)=>acc+Number(dv.valar),0)) + 
                    (downlineSubs * Number(systemParams.VALABONNEMENT ?? 0) + 
                    +((clientInfo.D_CREATION >= formData.startDate && clientInfo.D_CREATION <= formData.endDate) ? systemParams.VALABONNEMENTPROPRE:0))
                  ).toString()):'NA'}</h5>
            </div>
          </div>}
        </div>
      </section>
    </>
  );
};

export default Consultation;
