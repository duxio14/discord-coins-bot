const { description } = require("../games/pf");

module.exports = {
  metierLegal: {
    livreur: {
      nom: "🛵 Livreur",
      prix: 1000,
      salaire: 1000,
      impot: 0.05,
    },
    caissier: {
      nom: "🛒 Caissier",
      prix: 2000,
      salaire: 1500,
      impot: 0.07,
    },
    mineur: {
      nom: "⛏️ Mineur",
      prix: 4000,
      salaire: 3000,
      impot: 0.08,
    },
    jardinier: {
      nom: "🌿 Jardinier",
      prix: 5000,
      salaire: 3500,
      impot: 0.09,
    },
    conducteurBus: {
      nom: "🚌 Conducteur de Bus",
      prix: 7000,
      salaire: 5000,
      impot: 0.1,
    },
    cuisinier: {
      nom: "👨‍🍳 Cuisinier",
      prix: 10000,
      salaire: 7500,
      impot: 0.12,
    },
    dev: {
      nom: "💻 Développeur",
      prix: 15000,
      salaire: 10000,
      impot: 0.15,
    },
    médecin: {
      nom: "🩺 Médecin",
      prix: 20000,
      salaire: 15000,
      impot: 0.18,
    },
    avocat: {
      nom: "⚖️ Avocat",
      prix: 30000,
      salaire: 25000,
      impot: 0.2,
    },
    pilote: {
      nom: "✈️ Pilote",
      prix: 40000,
      salaire: 40000,
      impot: 0.25,
    }
  },

  metierIllegal: {
    voleur: {
      nom: "🕵️ Voleur",
      description: "Plus de chance sur les rob",
      prix: 25000,
      salaire: 18000,
      impot: 0.05,
    },
    hacker: {
      nom: "💀 Hacker",
      description: "Une commande .hack très intéressente",
      prix: 35000,
      salaire: 30000,
      impot: 0.03,
    },
    trafiquant: {
      nom: "📦 Trafiquant",
      description: "Gérer un trafique ça vous tente?",
      prix: 50000,
      salaire: 40000,
      impot: 0.01,
    }
  }
};
