const axios = require("axios");
const ExcelJS = require("exceljs");

// Replace with your actual cookies and headers
async function fetchComments() {
  const rawForm =
    "av=17841474655235796&__d=www&__user=0&__a=1&__req=fb&__hs=20237.HYP%3Ainstagram_web_pkg.2.1...1&dpr=1&__ccg=MODERATE&__rev=1023291536&__s=5ljtmc%3Aoctv50%3Ag5ln7p&__hsi=7509759690012693758&__dyn=7xeUjG1mxu1syUbFp41twpUnwgU7SbzEdF8aUco2qwJxS0DU2wx609vCwjE1EE2Cw8G11wBz81s8hwGxu786a3a1YwBgao6C0Mo2swtUd8-U2zxe2GewGw9a361qwuEjUlwhEe87q0oa2-azqwt8d-2u2J0bS1LwTwKG1pg2fwxyo6O1FwlA3a3zhA6bwgbxui2qi7E5y4UrwHwrE5SbBK4o11olxO2C&__csr=gP1z3AnMNkn2WflNvYgN2fiRfb_9ZdFA98lpBWrr8HFaRBp4Kn8UPVWaHLBXqBHLKAnWtamq-qQHLiCXx7l4gKWz9GFemiGahazp9EKEGfyFbQm9BQHyBJ7wxgB7zpeiWjjW-hybUCczXKAUy8V98pzUBa4KuVUowK-548DxDqQ00kt21sa0mS1SDU8WAw47g0Aa3gi0p-1oDgG7E422-1VPBudwjQ1iyoIw0yO0fiwa1BDw1CCq223S481984eaxe...";

  const headers = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/x-www-form-urlencoded",
    cookie:
      'csrftoken=F9Fxt4YHKIOuSzB5UEGMMYfjEDtgMidP; mid=aDeqjwABAAEsQQQBc6UXNHjSc863; ig_did=3876C831-6E48-4242-97EC-F31A004D26F8; ds_user_id=74846368507; dpr=1.5; ps_l=1; ps_n=1; datr=Mq03aEAihkt20DSVAv6Jqti4; wd=785x825; sessionid=74846368507%3AmpbqZ7GCJgOEiF%3A13%3AAYd0yprlsmZlVxxyLMqi5vJTZAyazjE5dMcm9nSkyw; rur="RVA\\05474846368507\\0541780058457:01fe23d2c15a4c9b51a552656d3dbe485d3cd13d27ab92c0e34c360216e6088dd8645cc6"',
    origin: "https://www.instagram.com",
    priority: "u=1, i",
    referer:
      "https://www.instagram.com/p/DG5wGfDt-CN/?img_index=2&igsh=MWloMmtoMGoyazhiYQ%3D%3D&__coig_challenged=1",
    "sec-ch-prefers-color-scheme": "dark",
    "sec-ch-ua":
      '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    "sec-ch-ua-full-version-list":
      '"Chromium";v="136.0.7103.114", "Google Chrome";v="136.0.7103.114", "Not.A/Brand";v="99.0.0.0"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"15.0.0"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "x-asbd-id": "359341",
    "x-bloks-version-id":
      "446750d9733aca29094b1f0c8494a768d5742385af7ba20c3e67c9afb91391d8",
    "x-csrftoken": "F9Fxt4YHKIOuSzB5UEGMMYfjEDtgMidP",
    "x-fb-friendly-name": "PolarisPostCommentsPaginationQuery",
    "x-fb-lsd": "b5d8rQDh95DO9-ee479bcb",
    "x-ig-app-id": "936619743392459",
    "x-root-field-name": "xdt_api__v1__media__media_id__comments__connection",
  };

  const response = await axios.post(
    "https://www.instagram.com/graphql/query",
    rawForm,
    { headers }
  );

  console.log("Response: ", response?.data);

  const edges =
    response?.data?.data?.xdt_api__v1__media__media_id__comments__connection
      ?.edges ?? [];

  return edges.map((edge: any) => edge?.node?.text);
}

const mediaId = "3590509427901187847"; // Replace with your media ID
const sortOrder = "popular"; // or 'chronological'

async function saveCommentsToExcel(comments: any) {
  console.log("comments ", comments);
  const workbook = new ExcelJS.Workbook();

  console.log("workbook ", workbook);
  const worksheet = workbook.addWorksheet("Instagram Comments");

  console.log("worksheet ", worksheet);
  worksheet.columns = [{ header: "Comment", key: "comment", width: 100 }];

  comments.forEach((comment: any) => {
    worksheet.addRow({ comment });
  });

  await workbook.xlsx.writeFile("instagram_comments.xlsx");
  console.log("Comments saved to instagram_comments.xlsx");
}

(async () => {
  const comments = await fetchComments();
  await saveCommentsToExcel(comments);
})();
