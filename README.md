# AWS authentication in GitHub Actions

Before running the **Deploy K8s Cluster** workflow, add these repository Actions
secrets in **Settings → Secrets and variables → Actions**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EC2_SSH_PRIVATE_KEY`

Use the access key pair for the AWS IAM user represented by the local
`aws-sotir` profile. The workflow creates that named profile on its temporary
runner, sets its region to `eu-west-3`, and verifies the identity with AWS STS.
Set `EC2_SSH_PRIVATE_KEY` to the private key corresponding to the `aws-default`
EC2 key pair configured in Terraform. The workflow uses it to reach the bastion
and then runs Ansible against the private Kubernetes nodes. It retrieves the
SSH host keys for the deployed hosts and adds them to the runner's `known_hosts`
before running the playbook.

Do not commit AWS credentials to the repository. The current workflow verifies
authentication, applies Terraform, and configures Kubernetes nodes with Ansible.

## Library management application

The three-layer React, Flask, and MongoDB application is in [`app/`](app/). Its
Dockerfiles build the frontend, backend, and lightweight MongoDB images. Build
them from that directory with `docker compose build`; this only creates images
and does not start or deploy the application. See [`app/README.md`](app/README.md)
for details.
