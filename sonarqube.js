import scanner from "sonarqube-scanner";

scanner(
  {
    serverUrl: "https:/sonar.fptupay.tech",
    token: "squ_8cd72ad6537a04bbf132aae3031fc50b9218b675",
    options: {
      "sonar.sources": "./src",
    },
  },
  () => process.exit()
);