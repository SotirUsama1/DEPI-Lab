# AWS authentication in GitHub Actions

Before running the **Deploy K8s Cluster** workflow, add these repository Actions
secrets in **Settings → Secrets and variables → Actions**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Use the access key pair for the AWS IAM user represented by the local
`aws-sotir` profile. The workflow creates that named profile on its temporary
runner, sets its region to `eu-west-3`, and verifies the identity with AWS STS.
Terraform steps can use the same profile through `TF_VAR_aws_profile`.

Do not commit AWS credentials to the repository. The current workflow verifies
authentication only; it does not yet run Terraform or deploy the cluster.
