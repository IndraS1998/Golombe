"use client";

import React, { useState,useEffect,useCallback } from "react";
import PageHeader from "@/partials/PageHeader";
import WarningAlert from "@/components/Alert";
import SeoMeta from "@/partials/SeoMeta";
import { useRouter } from "next/navigation";
import { useToken } from '@/context/TokenContext';

const Contact = () => {
  const title : string = "Page de Connexion"
  const description : string = "this is meta description"
  const meta_title : string = ""
  const image : string = "/images/logo.png"

  const [loginFailed, setLoginFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setToken } = useToken();
  const r = useRouter();

  const innit = useCallback(() =>{
    const token = localStorage.getItem("token");
    if (token){
      r.replace("/consultation");
    }
  },[r])

  useEffect(() => {
    innit()
  },[innit])
  
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    const fd = new FormData(event.currentTarget)
    const raw = {
      name : fd.get('name'),
      password : fd.get("password")
    }
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      });
      
      const result = await response.json();

      if (result.success) {
        localStorage.setItem("token",result.token)
        setLoginFailed(false);
        setToken(true);
        r.replace('/consultation');
      } else {
        setLoginFailed(true);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setLoginFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SeoMeta
        title={title}
        meta_title={meta_title}
        description={description}
        image={image}
      />
      <PageHeader title={title} />
      <section className="section-sm">
        <div className="container">
          <div className="row">
            <div className="mx-auto md:col-10 lg:col-6">
              <form onSubmit={handleSubmit}>
                {loginFailed && <WarningAlert message="Les paramètres de connexion sont invalides." />}
                <div className="mb-6">
                  <label htmlFor="name" className="form-label">
                    Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="form-input"
                    type="text"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="email" className="form-label">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    className="form-input"
                    type="password"
                  />
                </div>
                <button type="submit" className="btn btn-primary cursor-pointer">
                  {loading ? "Connexion..." : "Soumettre"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
