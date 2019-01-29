const { spawnSync, execSync } = require("child_process");
const { existsSync, copyFileSync } = require("fs");

const Koa = require("koa");
const app = new Koa();

app.use(async ctx => {
  try {
    let url = ctx.request.url;
    console.log("url", url);

    url = url.substring(2);
    let params = url.split("&");
    params = params
      .map(param => {
        const kv = param.split("=");
        if (kv.length !== 2) return null;

        const vs = kv[1].split(",");
        if (vs.length !== 1) {
          kv[1] = vs;
        }

        return kv;
      })
      .filter(param => !!param)
      .reduce((result, kv) => {
        result[kv[0]] = kv[1];
        return result;
      }, {});
    console.log("params", params);

    if (!params.dir || params.gitName || !params.nginx) {
      throw new Error("no dir specified.");
    }

    let gitName = params.git.split("/").pop();
    gitName = gitName.split(".").shift();
    console.log("git name", gitName);

    if (existsSync(`${params.dir}/${gitName}/`)) {
      execSync(`cd ${params.dir}/${gitName}/ && git pull`);
      console.log("repo updated");
    } else {
      spawnSync("git", ["clone", params.git, `${params.dir}/${gitName}`]);
      console.log("repo downdloaded");
    }

    execSync(`cd ${params.dir}/${gitName}/ && npm run build`);
    console.log("repo build well done");

    copyFileSync(
      `${params.dir}/${gitName}/route`,
      `${params.nginx}/${gitName}`
    );
    console.log("copied route file");

    execSync("nginx -s reload");
    console.log("reload nginx");

    ctx.response.status = 200;
    ctx.body = "Requested Done";
  } catch (err) {
    ctx.response.status = 500;
    ctx.body = "Something went wrong";
  }
});

app.listen(3000);
