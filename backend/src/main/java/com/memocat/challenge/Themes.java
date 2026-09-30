package com.memocat.challenge;

import java.time.LocalDate;
import java.util.List;

/** The themes the app picks from, one per week, in turn (the same week gives the same theme to both). */
final class Themes {

    static final List<String> ALL = List.of(
            "Quelque chose de bleu",
            "Ton café (ou ton thé)",
            "La vue de ta fenêtre",
            "Un truc qui te fait sourire",
            "Tes chaussures du jour",
            "Le ciel, maintenant",
            "Quelque chose de rond",
            "Ton coin préféré de la maison",
            "Ce que tu manges ce midi",
            "Une ombre",
            "Quelque chose de rouge",
            "Un détail que personne ne remarque",
            "Ton bureau (ou ce qui en tient lieu)",
            "Une plante",
            "Un reflet",
            "Quelque chose qui me fait penser à toi",
            "La dernière chose que tu as achetée",
            "Un animal croisé",
            "Ton plat réconfort",
            "Quelque chose de vieux",
            "Un mot écrit quelque part",
            "Ta chanson du moment (sa pochette)",
            "Quelque chose de jaune",
            "Le chemin que tu prends souvent",
            "Une porte",
            "Tes mains en train de faire quelque chose",
            "Un objet qui a une histoire",
            "La lumière du soir",
            "Quelque chose de minuscule",
            "Ce qu'il y a dans ton sac",
            "Un endroit où tu aimerais qu'on aille",
            "Quelque chose de vert",
            "Ton petit plaisir de la semaine",
            "Un motif (carrelage, tissu…)",
            "La météo en une photo",
            "Quelque chose de doux",
            "Ton reflet dans un miroir",
            "Un souvenir de vacances",
            "Quelque chose qui brille",
            "Le meilleur moment de ta journée",
            "Un escalier",
            "Quelque chose de rose",
            "Ta tasse préférée",
            "Un coucher (ou lever) de soleil",
            "Quelque chose qui sent bon",
            "Ton livre ou ta série du moment",
            "Un nuage",
            "Quelque chose de bizarre",
            "Ton goûter",
            "Un selfie grimace",
            "Quelque chose de nouveau",
            "Là où tu es, là, maintenant");

    private Themes() {
    }

    static String of(LocalDate weekStart) {
        return ALL.get((int) Math.floorMod(weekStart.toEpochDay() / 7, (long) ALL.size()));
    }
}
