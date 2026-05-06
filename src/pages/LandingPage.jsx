import { ArrowRight, Box, CheckCircle2, ChevronRight, Cpu, Layers, Monitor, Phone, Search, ShieldCheck, Users, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/button'
import logo from '../assets/logo_s.png'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-600 dark:text-slate-300 selection:bg-[#1ea0d6] selection:text-white transition-colors duration-300">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-white dark:bg-gradient-to-b dark:from-[#0a192f] dark:to-[#0d2a45] opacity-95" />
        <motion.div 
          initial={{ opacity: 0, rotate: -25 }}
          animate={{ opacity: 0.1, dark: 0.3, rotate: -15 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -left-[20%] top-[-10%] w-[70%] h-[120%] bg-slate-200 dark:bg-[#113a5d] rounded-[100px] blur-3xl opacity-20 dark:opacity-30" 
        />
        <motion.div 
          initial={{ opacity: 0, rotate: 15 }}
          animate={{ opacity: 0.2, dark: 0.6, rotate: 25 }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
          className="absolute right-[10%] bottom-[-20%] w-[50%] h-[80%] bg-slate-100 dark:bg-[#0a1f33] rounded-[50px] opacity-40 dark:opacity-60" 
        />
        <div className="absolute left-[30%] top-[40%] w-[40%] h-[40%] bg-[#1ea0d6] rounded-full opacity-5 dark:opacity-10 blur-[120px]" />
        {/* Architectural grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)_translateZ(-200px)] opacity-20" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12 backdrop-blur-md bg-white/40 dark:bg-slate-900/40 border-b border-slate-200 dark:border-white/5"
      >
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-xl p-2.5 shadow-lg inline-flex items-center gap-3">
          <img src={logo} alt="Condori Logo" className="h-8 object-contain" />
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#vision" className="text-slate-900 dark:text-slate-100 hover:text-[#1ea0d6] transition-colors">Vision</a>
          <a href="#solutions" className="text-slate-900 dark:text-slate-100 hover:text-[#1ea0d6] transition-colors">Solutions</a>
          <a href="#mission" className="text-slate-900 dark:text-slate-100 hover:text-[#1ea0d6] transition-colors">Notre Mission</a>
        </nav>
        <Link to="/login">
          <Button className="bg-[#1ea0d6] hover:bg-[#1580aa] text-white rounded-full px-6 font-semibold shadow-lg shadow-[#1ea0d6]/20 transition-all hover:scale-105 active:scale-95">
            Espace de Travail <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </motion.header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-20 lg:px-12 lg:py-32 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          <div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#1ea0d6]/30 bg-[#1ea0d6]/10 px-3 py-1 text-sm font-medium text-[#1ea0d6] mb-6"
            >
              <ShieldCheck className="h-4 w-4" />
              Ingénierie & Innovation
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-[1.1] tracking-tight"
            >
              Vision globale de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1ea0d6] to-[#0d739c]">ConDori</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-8"
            >
              Les spécialistes des solutions informatiques spécifiques. Nous opérons dans le secteur des nouvelles technologies ayant pour principale activité le développement et la création de sites web, ainsi que la vente et la maintenance de matériels informatiques.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a href="#mission">
                 <Button size="lg" className="rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold h-14 px-8 shadow-xl border border-slate-200 dark:border-transparent">
                   Découvrir le projet <ChevronRight className="ml-2 h-5 w-5" />
                 </Button>
              </a>
              <a href="#solutions">
                 <Button size="lg" variant="outline" className="rounded-full border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/10 font-semibold h-14 px-8">
                   Nos Solutions
                 </Button>
              </a>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1ea0d6]/20 to-transparent rounded-3xl blur-3xl"></div>
            <div className="bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-3xl p-8 relative shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Notre Démarche</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                Leur démarche de gestion de projet couvre les phases d'étude et de diagnostic, de conseil, de conception, de réalisation et de mise en oeuvre chez le client.
              </p>
              <div className="space-y-4">
                {[
                  'Étude et diagnostic approfondi',
                  'Conseil et conception sur-mesure',
                  'Réalisation et intégration',
                  'Contrôle qualité continu'
                ].map((step, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + (i * 0.1) }}
                    className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/5"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#1ea0d6]/20 flex items-center justify-center shrink-0 border border-[#1ea0d6]/30">
                      <CheckCircle2 className="h-5 w-5 text-[#1ea0d6]" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{step}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Solutions Section */}
        <section id="solutions" className="mt-40">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Solutions Technologiques</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              En mesure de répondre aux besoins les plus pointus des clients en matière de système d'information et de logiciels de gestion.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              
               { icon: Cpu, title: 'GPAO', desc: 'Gestion de la Production Assistée par Ordinateur' },
               { icon: Box, title: 'ERP', desc: 'Progiciel de Gestion Intégré pour piloter votre entreprise' },
               { icon: Layers, title: 'Négoce', desc: 'Solutions complètes pour la gestion commerciale' },
               { icon: Users, title: 'Paie & Pointage', desc: 'Gestion des ressources humaines et suivi du temps' },
               { icon: Monitor, title: 'Reporting & Conseil', desc: 'Organisation, Comptabilité et Analyse des données' },
            ].map((sol, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="group bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-8 rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-[#1ea0d6]/30 transition-all duration-300 shadow-sm"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#1ea0d6]/20 transition-transform">
                  <sol.icon className="h-7 w-7 text-[#1ea0d6]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{sol.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{sol.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission Section */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          id="mission" 
          className="mt-40 mb-20 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900/80 dark:to-[#0a1f33]/80 border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 lg:p-16 relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1ea0d6]/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="max-w-3xl relative z-10">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-8">Définition de la Mission</h2>
            
            <div className="space-y-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1ea0d6]/20 flex items-center justify-center text-[#1ea0d6] text-sm">1</span>
                  Présentation du projet
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg bg-slate-50 dark:bg-slate-900/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5 border-l-4 border-l-[#1ea0d6]">
                  Le présent projet intitulé « Conception et réalisation d'une plateforme web pour la 
                  <strong className="text-slate-900 dark:text-slate-100"> Gestion de la Maintenance Assistée par Ordinateurs (GMAO)</strong> » 
                  est réalisé pour optimiser les processus au sein de la société ConDori, fruit d'un projet de fin d'études FS Sfax.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1ea0d6]/20 flex items-center justify-center text-[#1ea0d6] text-sm">2</span>
                  Objectifs à atteindre
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  L'objectif est la mise en place d'une plateforme web permettant de gérer efficacement l'ensemble du processus de maintenance des matériels informatiques, depuis la réception par le réceptionniste jusqu'à la restitution finale au client.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Optimiser la **communication et coordination** entre réceptionniste, manager, technicien et chef de stock.',
                    'Assurer la **traçabilité et le suivi précis** de chaque matériel, réparation et transaction de stock.',
                    'Garantir une **organisation fluide** et la sécurité des données grâce aux espaces de travail par rôles.',
                    'Assurer la **réduction des délais** d\'intervention en numérisant complètement les "Fiches de Réparations".'
                  ].map((text, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + (i * 0.1) }}
                      className="bg-white/50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-100 dark:border-white/5"
                    >
                      <p 
                        className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed" 
                        dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-slate-100">$1</strong>') }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-6 py-10 text-center">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl inline-block shadow-lg mx-auto mb-6">
           <img src={logo} alt="Condori Logo" className="h-8 object-contain" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} CondOri. Conseil - Développement - Organisation - Informatique.
        </p>
      </footer>
    </div>
  )
}