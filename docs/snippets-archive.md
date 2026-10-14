# Snippets removed from the public page

These short or specialist examples were removed during the October 2026 curation pass. They are kept here for reference. The original imports remain in `Code Snippets/` and the linked Notion page.

## Pickle a local object

Only unpickle files from trusted sources; loading a pickle can execute code.

```python
import pickle

with open('data.pkl', 'wb') as file:
    pickle.dump(data, file)

with open('data.pkl', 'rb') as file:
    data = pickle.load(file)
```

## Upload a pickle to S3

```python
import boto3
import pickle

s3 = boto3.client('s3')
s3.put_object(Bucket='BUCKET_NAME', Key='model.pkl', Body=pickle.dumps(model))
```

## Small shell and Scala examples

```bash
docker exec -it CONTAINER_NAME sh
docker image history IMAGE_NAME
tar -czvf archive.tar.gz ./directory
```

```scala
import java.nio.file.{Files, Paths}

val exists = Files.isRegularFile(Paths.get(filePath))
```
