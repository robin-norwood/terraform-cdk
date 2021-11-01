import { Construct } from "constructs";
import { App, TerraformStack, TerraformVariable, Testing } from "cdktf";
import * as NullProvider from "./.gen/providers/null";
import * as Aws from "./.gen/providers/aws";
import * as Azure from "./.gen/providers/azurerm";
import * as Google from "./.gen/providers/google";
import * as Kubernetes from "./.gen/providers/kubernetes";
import * as Openstack from "./.gen/providers/openstack";
import * as Nomad from "./.gen/providers/nomad";
import * as Vault from "./.gen/providers/vault";
import * as Consul from "./.gen/providers/consul";
import * as External from "./.gen/providers/external";

export class UsingAllProviders extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new NullProvider.NullProvider(this, "null", {});

    const nullResouce = new NullProvider.Resource(this, "test", {});

    nullResouce.addOverride("provisioner", [
      {
        "local-exec": {
          command: `echo "hello deploy"`,
        },
      },
    ]);

    [Aws, Azure, Google, Kubernetes, Nomad, Vault, Openstack, Consul, External];
  }
}

export class NamespacedProviders extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new Aws.AwsProvider(this, "aws", {
      region: "us-east-1",
    });

    const ami = new Aws.EC2.DataAwsAmi(this, "ami", {
      mostRecent: true,
      owners: ["amazon"],
    });

    new Aws.EC2.Instance(this, "instance", {
      ami: ami.id,
      availabilityZone: "us-east-1a",
      instanceType: "t2.micro",
    });

    const userId = new Aws.DataSources.DataAwsCallerIdentity(
      this,
      "callerIdentity",
      {}
    );
    new Aws.LambdaFunction.LambdaFunction(this, "lambdaFn", {
      handler: "index.handler",
      runtime: "nodejs12.x",
      timeout: 10,
      functionName: userId.accountId,
      role: new Aws.IAM.IamRole(this, "role", {
        assumeRolePolicy: "assumeRolePolicy",
      }).arn,
    });
  }
}

// TODO: add provider "references"
export class References extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // simple references
    new Nomad.NomadProvider(this, "nomad", { address: "http://127.0.0.1" });
    const job = new Nomad.JobA(this, "jobA", {
      jobspec: "./job/spec.hcl",
    });

    new Nomad.JobA(this, "jobB", {
      jobspec: job.jobspec,
    });

    // single-item references
    new Kubernetes.KubernetesProvider(this, "k8s", {});
    const namespace = new Kubernetes.NamespaceA(this, "namespace", {
      metadata: { name: "my-namespace" },
    });
    new Kubernetes.Deployment(this, "deployment", {
      metadata: {
        name: "my-deployment",
        namespace: namespace.metadata.name,
      },
      spec: {
        replicas: "1",
        selector: {
          matchLabels: {
            app: "my-deployment",
          },
        },
        template: {
          metadata: {
            labels: {
              app: "my-deployment",
            },
          },
          spec: {
            container: [
              {
                name: "my-deployment",
                image: "nginx",
              },
            ],
          },
        },
      },
    });
  }
}

export class Mutation extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const namespace = new TerraformVariable(this, "namespace", {
      type: "string",
      default: "default",
    }).stringValue;

    new Kubernetes.KubernetesProvider(this, "k8s", {});
    const deployment = new Kubernetes.Deployment(this, "deployment", {
      metadata: { name: "my-deployment" },
      spec: {
        replicas: "1",
        selector: {
          matchLabels: {
            app: "my-deployment",
          },
        },
        template: {
          metadata: {
            labels: {
              app: "my-deployment",
            },
          },
          spec: {
            container: [
              {
                name: "my-deployment",
                image: "nginx",
              },
            ],
          },
        },
      },
    });

    // direct primitive mutation
    deployment.spec.replicas = "2";

    // direct reference mutation
    deployment.metadata.namespace = namespace;

    // object mutation (not yet supported
    // deployment.spec.selector = {
    //   matchLabels: {
    //     app: "my-other-deployment",
    //   },
    // }

    // list mutation (not yet supported)
    // const containerImage = new TerraformVariable(this, "containerImage", {
    //   type: "string",
    //   default: "nginix",
    // }).stringValue;

    // deployment.spec.template.spec.container?.push({
    //   name: "my-other-container",
    //   image: containerImage,
    // });
  }
}

const app = Testing.stubVersion(new App({}));
new UsingAllProviders(app, "using-all-providers");
new NamespacedProviders(app, "namespaces");
new References(app, "references");
new Mutation(app, "mutation");
app.synth();
