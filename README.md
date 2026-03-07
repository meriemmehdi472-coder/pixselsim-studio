Éditeur de photos et de vidéos

Ce projet consiste à développer un éditeur de photos et de vidéos permettant aux utilisateurs d’effectuer différentes modifications sur leurs médias de manière simple et rapide.

Fonctionnalités actuelles

L’application permet actuellement de :

Réencadrer les médias (photos ou vidéos).

Ajouter du texte par-dessus les images ou les vidéos.

Insérer des émojis pour enrichir le contenu visuel.

Appliquer des cadres ou des formes autour des médias afin de personnaliser leur apparence.

État du projet

Le projet est toujours en cours de développement et plusieurs fonctionnalités sont en préparation.

Prochaines fonctionnalités

Les prochaines étapes du développement incluent :

La création d’un compte utilisateur vérifié, permettant d’accéder à une bibliothèque de vidéos déjà prêtes à être utilisées.

La possibilité de découper une vidéo ou d’extraire une séquence spécifique, afin de réduire sa durée ou de la repositionner dans le montage. (Fonctionnalité actuellement en développement.)

L’ajout de différents onglets et formes pour encadrer les médias.

L’intégration de nouveaux types de cadres pour offrir davantage d’options de personnalisation.

La possibilité d’importer plusieurs photos ou vidéos afin de réaliser un véritable montage vidéo.


Backend
- Récupérer le dépôt en local ( ordinateur) : git clone https://github.com/meriemmehdi472-coder/pixselsim-studio.com
- Ce déplaer vers le dossier Backend : cd pixselsim-studio/backend 
-Installer les dépendances Rails nécessaires : bundle install
-Créer la db locale à partir du fichier config/database.yml : rails db:create
-Migrer la base de données pour créer les tables et la structure  : rails db:migrate 
-Lancer le serveur back : rails server || rails s
Frontend
-cd frontend 
-Installer les dépendances du projet : npm install 
-Lancer le serveur de développement : npm run dev


le serveur est en localhost
Backend : http://localhost:3000
Frontend : http://localhost:5173
